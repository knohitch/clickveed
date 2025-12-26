'use server';

import { Stripe } from 'stripe';
import prisma from '@lib/prisma';
import { upsertUser } from '@/server/actions/user-actions';
import { sendEmail } from './email-service';
import { getAdminSettings } from '@/server/actions/admin-actions';
import { getBaseUrl } from '@/lib/utils';

// Fix Bug #4: Stripe singleton pattern with cache invalidation
// Create a single Stripe instance that is reused across all function calls
// Cache is invalidated when the secret key changes
let stripeInstance: Stripe | null = null;
let cachedStripeKey: string | null = null;

async function getStripeInstance(): Promise<Stripe> {
    const { apiKeys } = await getAdminSettings();
    const stripeSecretKey = apiKeys.stripeSecretKey || process.env.STRIPE_SECRET_KEY;

    if (!stripeSecretKey) {
        throw new Error('Stripe secret key not configured in admin settings or environment variables');
    }

    // Invalidate cache if the key has changed
    if (cachedStripeKey !== stripeSecretKey) {
        console.log('Stripe key changed, invalidating cached instance');
        stripeInstance = null;
        cachedStripeKey = stripeSecretKey;
    }

    // Create new instance if needed
    if (!stripeInstance) {
        console.log('Creating new Stripe instance');
        stripeInstance = new Stripe(stripeSecretKey, { apiVersion: '2024-06-20' });
    }

    return stripeInstance;
}

/**
 * Manually invalidate the Stripe instance cache.
 * Call this after updating Stripe API keys in admin settings.
 */
export function invalidateStripeCache() {
    console.log('Manually invalidating Stripe cache');
    stripeInstance = null;
    cachedStripeKey = null;
}

/**
 * Creates a Stripe Checkout session for a subscription.
 */
export async function createCheckoutSession(
    userId: string, 
    planId: string, 
    billingCycle: 'monthly' | 'quarterly' | 'yearly', 
    stripeSecretKey: string
) {
    // Fix Bug #6: Use singleton Stripe instance
    const stripe = await getStripeInstance();

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
 */
export async function createCustomerPortalSession(userId: string, stripeSecretKey: string) {
    // Fix Bug #6: Use singleton Stripe instance
    const stripe = await getStripeInstance();

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
 */
export async function handleStripeWebhookEvent(event: Stripe.Event) {
    // Fix Bug #6: Use singleton Stripe instance
    const stripe = await getStripeInstance();

    switch (event.type) {
        case 'checkout.session.completed': {
            const session = event.data.object as Stripe.Checkout.Session;
             if (session.mode === 'subscription' && session.metadata?.userId) {
                const subscription = await stripe.subscriptions.retrieve(session.subscription as string);

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
                    // Send email to user about subscription activation with NEW plan name
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
                    // Send email to user about subscription renewal
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
                 const freePlan = await prisma.plan.findFirst({
                    where: { name: 'Free' }
                });
                if (!freePlan) {
                    console.error("Critical: 'Free' plan not found. Cannot downgrade user.");
                    return;
                }
                
                // Send email to user about subscription cancellation
                const adminSettings = await getAdminSettings();
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
