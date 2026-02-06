'use server';

import prisma from '@/server/prisma';
import { sendEmail } from '@/server/services/email-service';
import { getAdminSettings } from '@/server/actions/admin-actions';

export type NotificationType = 
  | 'subscription_expiring_7d'
  | 'subscription_expiring_3d'
  | 'subscription_expiring_1d'
  | 'subscription_expired'
  | 'subscription_renewed'
  | 'payment_success'
  | 'payment_failed'
  | 'plan_upgraded'
  | 'feature_unlocked'
  | 'welcome';

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
}

/**
 * Create a notification for a user
 */
export async function createNotification(params: CreateNotificationParams) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
      },
    });

    console.log(`[Notifications] Created ${params.type} notification for user ${params.userId}`);
    return notification;
  } catch (error) {
    console.error('[Notifications] Failed to create notification:', error);
    throw error;
  }
}

/**
 * Get notifications for a user
 */
export async function getUserNotifications(userId: string, options?: { unreadOnly?: boolean; limit?: number }) {
  try {
    const where: any = { userId };
    if (options?.unreadOnly) {
      where.isRead = false;
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 50,
    });

    const unreadCount = await prisma.notification.count({
      where: { userId, isRead: false },
    });

    return { notifications, unreadCount };
  } catch (error) {
    console.error('[Notifications] Failed to get notifications:', error);
    throw error;
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: string) {
  try {
    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
    return { success: true };
  } catch (error) {
    console.error('[Notifications] Failed to mark notification as read:', error);
    throw error;
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId: string) {
  try {
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
    return { success: true };
  } catch (error) {
    console.error('[Notifications] Failed to mark all notifications as read:', error);
    throw error;
  }
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string) {
  try {
    await prisma.notification.delete({
      where: { id: notificationId },
    });
    return { success: true };
  } catch (error) {
    console.error('[Notifications] Failed to delete notification:', error);
    throw error;
  }
}

/**
 * Send subscription expiration reminder
 */
export async function sendSubscriptionExpirationReminder(
  userId: string,
  daysUntilExpiry: number
) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { plan: true },
    });

    if (!user || !user.plan) {
      console.log(`[SubscriptionAlert] User ${userId} or plan not found`);
      return;
    }

    const periodEnd = user.stripeCurrentPeriodEnd;
    if (!periodEnd) {
      console.log(`[SubscriptionAlert] User ${userId} has no subscription period end`);
      return;
    }

    const adminSettings = await getAdminSettings();
    const renewalDate = new Date(periodEnd).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // Create in-app notification - use specific type based on days
    let notificationType: NotificationType;
    if (daysUntilExpiry === 7) {
      notificationType = 'subscription_expiring_7d';
    } else if (daysUntilExpiry === 3) {
      notificationType = 'subscription_expiring_3d';
    } else {
      notificationType = 'subscription_expiring_1d';
    }
    await createNotification({
      userId,
      type: notificationType,
      title: 'Subscription Expiring Soon',
      message: `Your ${user.plan.name} subscription will expire on ${renewalDate}. Renew now to avoid interruption.`,
    });

    // Send email notification
    await sendEmail({
      to: user.email!,
      templateKey: 'subscriptionRenewal',
      data: {
        appName: adminSettings.appName,
        userName: user.displayName || 'User',
        planName: user.plan.name,
        renewalDate,
      },
    });

    console.log(`[SubscriptionAlert] Sent ${daysUntilExpiry}-day reminder to user ${userId}`);
    return { success: true };
  } catch (error) {
    console.error('[SubscriptionAlert] Failed to send expiration reminder:', error);
    throw error;
  }
}

/**
 * Send subscription expired notification
 */
export async function sendSubscriptionExpiredNotification(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { plan: true },
    });

    if (!user || !user.plan) {
      return;
    }

    const adminSettings = await getAdminSettings();

    // Create in-app notification
    await createNotification({
      userId,
      type: 'subscription_expired',
      title: 'Subscription Expired',
      message: `Your ${user.plan.name} subscription has expired. Please renew to continue using premium features.`,
    });

    // Send email notification
    await sendEmail({
      to: user.email!,
      templateKey: 'subscriptionCanceled',
      data: {
        appName: adminSettings.appName,
        userName: user.displayName || 'User',
        planName: user.plan.name,
      },
    });

    console.log(`[SubscriptionAlert] Sent expired notification to user ${userId}`);
    return { success: true };
  } catch (error) {
    console.error('[SubscriptionAlert] Failed to send expired notification:', error);
    throw error;
  }
}

/**
 * Check all subscriptions for expiration alerts
 * This should be run via cron job (e.g., daily)
 */
export async function checkSubscriptionsForExpirationAlerts() {
  console.log('[SubscriptionAlert] Starting expiration check...');
  
  try {
    // Find all users with active subscriptions
    const usersWithSubscriptions = await prisma.user.findMany({
      where: {
        stripeSubscriptionId: { not: null },
        stripeSubscriptionStatus: 'active',
        stripeCurrentPeriodEnd: { not: null },
      },
      include: { plan: true },
    });

    let alertsSent = 0;
    const now = new Date();

    for (const user of usersWithSubscriptions) {
      if (!user.stripeCurrentPeriodEnd) continue;

      const daysUntilExpiry = Math.ceil(
        (new Date(user.stripeCurrentPeriodEnd).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Send reminders at 7, 3, and 1 day before expiry
      if (daysUntilExpiry === 7 || daysUntilExpiry === 3 || daysUntilExpiry === 1) {
        await sendSubscriptionExpirationReminder(user.id, daysUntilExpiry);
        alertsSent++;
      }

      // Handle expired subscriptions
      if (daysUntilExpiry <= 0) {
        // Check if we already sent expired notification
        const existingNotification = await prisma.notification.findFirst({
          where: {
            userId: user.id,
            type: 'subscription_expired',
            createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) }, // Last 24 hours
          },
        });

        if (!existingNotification) {
          await sendSubscriptionExpiredNotification(user.id);
          alertsSent++;
        }
      }
    }

    console.log(`[SubscriptionAlert] Completed. Sent ${alertsSent} alerts.`);
    return { success: true, alertsSent };
  } catch (error) {
    console.error('[SubscriptionAlert] Error during expiration check:', error);
    throw error;
  }
}
