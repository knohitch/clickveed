
'use server';

import { Stripe } from 'stripe';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAdminSettings } from '@/server/actions/admin-actions';
import { upsertUser } from '@/server/actions/user-actions';

export async function POST(req: Request) {
    const body = await req.text();
    const signature = headers().get('Stripe-Signature') as string;

    const { apiKeys } = await getAdminSettings();
    if (!apiKeys.stripeSecretKey) {
        return new NextResponse('Stripe secret key not configured.', { status: 500 });
    }
    const stripe = new Stripe(apiKeys.stripeSecretKey, { apiVersion: '2024-06-20' });
    const webhookSecret = apiKeys.stripeWebhookSecret;

    if (!webhookSecret) {
        console.error("Stripe webhook secret is not configured.");
        return new NextResponse('Webhook secret not configured.', { status: 400 });
    }

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
    }
    
    console.log(`Received Stripe event: ${event.type}`);

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                if (session.mode === 'subscription' && session.metadata?.userId) {
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
                    // Determine the new planId based on the stripePriceId
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
                        planId: plan?.id, // Update the planId if found
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
                    // Find the default "Creator" plan to downgrade the user
                     const creatorPlan = await prisma.plan.findFirst({
                        where: { name: { equals: 'Creator', mode: 'insensitive' } }
                    });

                     await upsertUser({
                        id: user.id,
                        email: user.email!,
                        stripeSubscriptionStatus: subscription.status, // will be 'canceled'
                        planId: creatorPlan?.id, // Revert user to the creator plan
                        stripeSubscriptionId: null,
                        stripePriceId: null,
                     });
                }
                break;
            }
            default:
                console.log(`Unhandled event type ${event.type}`);
        }
    } catch (error) {
        console.error("Error processing webhook:", error);
        return new NextResponse('Webhook handler failed. See logs.', { status: 500 });
    }

    return new NextResponse(JSON.stringify({ received: true }), { status: 200 });
}
