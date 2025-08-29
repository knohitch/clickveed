
'use server';

import { Stripe } from 'stripe';
import prisma from '@/server/prisma';
import { upsertUser } from '@/server/actions/user-actions';

const getURL = () => {
    const url = process.env.NEXTAUTH_URL;
    if (!url) throw new Error("NEXTAUTH_URL environment variable is not set.");
    return url;
};

/**
 * Creates a Stripe Checkout session for a subscription.
 */
export async function createCheckoutSession(
    userId: string, 
    planId: string, 
    billingCycle: 'monthly' | 'quarterly' | 'yearly', 
    stripeSecretKey: string
) {
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-06-20' });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found.');

    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) throw new Error('Plan not found.');
    
    let stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
            email: user.email!,
            name: user.name ?? undefined,
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

    const checkoutSession = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        billing_address_collection: 'required',
        customer: stripeCustomerId,
        line_items: [{ price: stripePriceId, quantity: 1 }],
        mode: 'subscription',
        success_url: `${getURL()}/dashboard/settings?payment_success=true`,
        cancel_url: `${getURL()}/dashboard/settings`,
        metadata: { userId, planId, priceId: stripePriceId },
    });

    return { sessionId: checkoutSession.id };
}

/**
 * Creates a Stripe Customer Portal session.
 */
export async function createCustomerPortalSession(userId: string, stripeSecretKey: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.stripeCustomerId) {
        throw new Error('Stripe customer not found for this user.');
    }
    
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-06-20' });
    
    const portalSession = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `${getURL()}/dashboard/settings`,
    });

    return { url: portalSession.url };
}


/**
 * Handles incoming Stripe webhook events.
 */
export async function handleStripeWebhookEvent(event: Stripe.Event) {
    switch (event.type) {
        case 'checkout.session.completed': {
            const session = event.data.object as Stripe.Checkout.Session;
             if (session.mode === 'subscription' && session.metadata?.userId) {
                const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' });
                const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
                
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
            }
            break;
        }
        case 'customer.subscription.updated': {
            const subscription = event.data.object as Stripe.Subscription;
            const user = await prisma.user.findFirst({
                where: { stripeSubscriptionId: subscription.id },
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
            });
            if (user) {
                 const freePlan = await prisma.plan.findFirst({
                    where: { name: 'Free' }
                });
                if (!freePlan) {
                    console.error("Critical: 'Free' plan not found. Cannot downgrade user.");
                    return;
                }
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
