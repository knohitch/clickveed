'use server';

import { Stripe } from 'stripe';
import prisma from '@lib/prisma';
import { upsertUser } from '@/server/actions/user-actions';
import { sendEmail } from './email-service';
import { getAdminSettings } from '@/server/actions/admin-actions';
import { getBaseUrl } from '@/lib/utils';
import { createNotification } from './notification-service';

/**
 * Creates a new Stripe instance using ONLY environment variables.
 * No database calls, no caching - simple and safe.
 */
function createStripeInstance(): Stripe {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    
    if (!stripeSecretKey) {
        throw new Error(
            'Stripe secret key is not configured. ' +
            'Please add STRIPE_SECRET_KEY to your environment variables.'
        );
    }
    
    return new Stripe(stripeSecretKey, {
        apiVersion: '2024-06-20',
        typescript: true
    });
}

/**
 * Validates that Stripe is configured via environment variables.
 * Returns true if STRIPE_SECRET_KEY is present.
 * Must be async because it's exported from a 'use server' file.
 */
export async function isStripeConfigured(): Promise<boolean> {
    return !!process.env.STRIPE_SECRET_KEY;
}

/**
 * Creates a Stripe Checkout session for a subscription.
 * Uses ONLY environment variables for Stripe configuration.
 */
export async function createCheckoutSession(
    userId: string, 
    planId: string, 
    billingCycle: 'monthly' | 'quarterly' | 'yearly'
) {
    // Create Stripe instance from environment variable only
    const stripe = createStripeInstance();

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found.');

    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) throw new Error('Plan not found.');
    
    let stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
            email: user.email!,
            name: user.displayName ?? undefined,
            metadata: { userId: user.id },
        });
        stripeCustomerId = customer.id;
        await prisma.user.update({
            where: { id: userId },
            data: { stripeCustomerId },
        });
    }

    let priceIdField: 'stripePriceIdMonthly' | 'stripePriceIdQuarterly' | 'stripePriceIdYearly';
    switch (billingCycle) {
        case 'monthly': priceIdField = 'stripePriceIdMonthly'; break;
        case 'quarterly': priceIdField = 'stripePriceIdQuarterly'; break;
        case 'yearly': priceIdField = 'stripePriceIdYearly'; break;
    }
    const stripePriceId = plan[priceIdField];

    if (!stripePriceId) {
        throw new Error(`Stripe Price ID for ${billingCycle} cycle not found for this plan.`);
    }

    const baseUrl = getBaseUrl();
    const checkoutSession = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        billing_address_collection: 'required',
        customer: stripeCustomerId,
        line_items: [{ price: stripePriceId, quantity: 1 }],
        mode: 'subscription',
        success_url: `${baseUrl}/dashboard/settings/billing?payment_success=true`,
        cancel_url: `${baseUrl}/dashboard/settings/billing`,
        metadata: { userId, planId, priceId: stripePriceId },
    });

    return { sessionId: checkoutSession.id };
}

/**
 * Creates a Stripe Customer Portal session.
 * Uses ONLY environment variables for Stripe configuration.
 */
export async function createCustomerPortalSession(userId: string) {
    // Create Stripe instance from environment variable only
    const stripe = createStripeInstance();

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.stripeCustomerId) {
        throw new Error('Stripe customer not found for this user.');
    }
    
    const baseUrl = getBaseUrl();
    const portalSession = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `${baseUrl}/dashboard/settings/billing`,
    });

    return { url: portalSession.url };
}

/**
 * Handles incoming Stripe webhook events.
 * Uses ONLY environment variables for Stripe configuration.
 */
export async function handleStripeWebhookEvent(event: Stripe.Event) {
    // Create Stripe instance from environment variable only
    const stripe = createStripeInstance();

    switch (event.type) {
        case 'checkout.session.completed': {
            const session = event.data.object as Stripe.Checkout.Session;
            console.log('[StripeWebhook] Checkout completed for user:', session.metadata?.userId);
            
             if (session.mode === 'subscription' && session.metadata?.userId) {
                const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
                
                // Safety check for subscription items
                if (!subscription.items?.data?.[0]?.price?.id) {
                    console.error('[StripeWebhook] Invalid subscription data:', subscription);
                    break;
                }

                // First, update the user with the new plan
                await upsertUser({
                    id: session.metadata.userId,
                    email: session.customer_details?.email!,
                    stripeCustomerId: subscription.customer as string,
                    stripeSubscriptionId: subscription.id,
                    stripeSubscriptionStatus: subscription.status,
                    stripePriceId: subscription.items.data[0].price.id,
                    stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
                    planId: session.metadata.planId,
                });

                // Now get the updated user with NEW plan details for email notification
                const updatedUser = await prisma.user.findUnique({
                    where: { id: session.metadata.userId },
                    include: { plan: true }
                });

                if (updatedUser && updatedUser.plan) {
                    // getAdminSettings is OK here - it's for email templates, not Stripe config
                    const adminSettings = await getAdminSettings();
                    try {
                        await sendEmail({
                            to: updatedUser.email!,
                            templateKey: 'subscriptionActivated',
                            data: {
                                appName: adminSettings.appName,
                                userName: updatedUser.displayName || 'User',
                                planName: updatedUser.plan.name,
                            }
                        });

                        // Create in-app notification
                        await createNotification({
                            userId: updatedUser.id,
                            type: 'plan_upgraded',
                            title: 'Subscription Activated!',
                            message: `Your ${updatedUser.plan.name} subscription is now active. Enjoy your new features!`,
                        });

                        // Send email to admin about new subscription
                        await sendEmail({
                            to: 'admin',
                            templateKey: 'adminNewUser',
                            data: {
                                appName: adminSettings.appName,
                                userEmail: updatedUser.email!,
                                userName: updatedUser.displayName || 'User',
                                planName: updatedUser.plan.name,
                            }
                        });
                    } catch (emailError) {
                        // Log but don't fail the webhook if email fails
                        console.error('Failed to send subscription emails:', emailError);
                    }
                }
            }
            break;
        }
        case 'customer.subscription.updated': {
            const subscription = event.data.object as Stripe.Subscription;
            const user = await prisma.user.findFirst({
                where: { stripeSubscriptionId: subscription.id },
                include: { plan: true }
            });

            if (user) {
                // Safety check for subscription items
                if (!subscription.items?.data?.[0]?.price?.id) {
                    console.error('[StripeWebhook] Invalid subscription data for update:', subscription);
                    break;
                }
                
                const newStripePriceId = subscription.items.data[0].price.id;
                const plan = await prisma.plan.findFirst({
                    where: { 
                        OR: [
                            { stripePriceIdMonthly: newStripePriceId },
                            { stripePriceIdQuarterly: newStripePriceId },
                            { stripePriceIdYearly: newStripePriceId },
                        ]
                     }
                });
                
                // Check if this is a renewal (active status)
                if (subscription.status === 'active') {
                    // getAdminSettings is OK here - it's for email templates, not Stripe config
                    const adminSettings = await getAdminSettings();
                    await sendEmail({
                        to: user.email!,
                        templateKey: 'subscriptionRenewal',
                        data: {
                            appName: adminSettings.appName,
                            userName: user.displayName || 'User',
                            planName: plan?.name || user.plan?.name || 'Unknown Plan',
                            renewalDate: new Date(subscription.current_period_end * 1000).toLocaleDateString(),
                        }
                    });

                    // Create in-app notification for renewal
                    await createNotification({
                        userId: user.id,
                        type: 'subscription_renewed',
                        title: 'Subscription Renewed',
                        message: `Your ${plan?.name || user.plan?.name} subscription has been renewed. Next billing date: ${new Date(subscription.current_period_end * 1000).toLocaleDateString()}`,
                    });
                    
                    // Send email to admin about subscription renewal
                    await sendEmail({
                        to: 'admin',
                        templateKey: 'adminSubscriptionRenewed',
                        data: {
                            appName: adminSettings.appName,
                            userName: user.displayName || 'User',
                            userEmail: user.email!,
                            planName: plan?.name || user.plan?.name || 'Unknown Plan',
                        }
                    });
                }

                 await upsertUser({
                    id: user.id,
                    email: user.email!,
                    stripeSubscriptionStatus: subscription.status,
                    stripePriceId: newStripePriceId,
                    stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
                    planId: plan?.id,
                });
            }
            break;
        }
         case 'customer.subscription.deleted': {
            const subscription = event.data.object as Stripe.Subscription;
            const user = await prisma.user.findFirst({
                where: { stripeSubscriptionId: subscription.id },
                include: { plan: true }
            });
            if (user) {
                // Find free plan dynamically instead of hardcoding "Free"
                const freePlan = await prisma.plan.findFirst({
                    where: { 
                        OR: [
                            { name: 'Free' },
                            { featureTier: 'free' }
                        ]
                    }
                });
                
                if (!freePlan) {
                    console.error("Critical: 'Free' plan not found. Cannot downgrade user.");
                    return;
                }
                
                // getAdminSettings is OK here - it's for email templates, not Stripe config
                const adminSettings = await getAdminSettings();
                
                // Send email to user about subscription cancellation
                await sendEmail({
                    to: user.email!,
                    templateKey: 'subscriptionCanceled',
                    data: {
                        appName: adminSettings.appName,
                        userName: user.displayName || 'User',
                        planName: user.plan?.name || 'Unknown Plan',
                    }
                });
                
                // Send email to admin about subscription cancellation
                await sendEmail({
                    to: 'admin',
                    templateKey: 'adminSubscriptionCanceled',
                    data: {
                        appName: adminSettings.appName,
                        userName: user.displayName || 'User',
                        userEmail: user.email!,
                        planName: user.plan?.name || 'Unknown Plan',
                    }
                });
                
                 await upsertUser({
                    id: user.id,
                    email: user.email!,
                    stripeSubscriptionStatus: subscription.status,
                    planId: freePlan.id,
                    stripeSubscriptionId: null,
                    stripePriceId: null,
                 });
            }
            break;
        }
        default:
            console.log(`Unhandled event type ${event.type}`);
    }
}
