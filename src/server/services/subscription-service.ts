'use server';

import prisma from '@/server/prisma';
import { sendEmail } from './email-service';
import { getAdminSettings } from '@/server/actions/admin-actions';

/**
 * Checks for subscriptions that are about to renew and sends reminders.
 * This function should be called by a cron job.
 */
export async function sendSubscriptionRenewalReminders() {
    console.log("Running Subscription Renewal Reminders Cron Job...");
    
    try {
        // Find subscriptions that will renew in 3 days
        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
        
        // Find users with subscriptions ending in 3 days
        const users = await prisma.user.findMany({
            where: {
                stripeSubscriptionId: {
                    not: null
                },
                stripeCurrentPeriodEnd: {
                    lte: threeDaysFromNow,
                    gte: new Date() // Not already expired
                },
                stripeSubscriptionStatus: 'active'
            },
            include: {
                plan: true
            }
        });
        
        console.log(`Found ${users.length} users with subscriptions renewing soon`);
        
        const adminSettings = await getAdminSettings();
        
        for (const user of users) {
            if (user.email && user.plan) {
                try {
                    // Send renewal reminder to user
                    await sendEmail({
                        to: user.email,
                        templateKey: 'subscriptionRenewal',
                        data: {
                            appName: adminSettings.appName,
                            userName: user.displayName || 'User',
                            planName: user.plan.name,
                            renewalDate: user.stripeCurrentPeriodEnd?.toLocaleDateString() || 'Unknown Date',
                        }
                    });
                    
                    console.log(`Sent renewal reminder to ${user.email} for plan ${user.plan.name}`);
                } catch (error) {
                    console.error(`Failed to send renewal reminder to ${user.email}:`, error);
                }
            }
        }
        
        console.log("Subscription Renewal Reminders Cron Job complete.");
        return { success: true, processed: users.length };
        
    } catch (error) {
        console.error("Error in subscription renewal reminders cron job:", error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}
