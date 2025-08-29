
'use server';

import { Stripe } from 'stripe';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { getAdminSettings } from '@/server/actions/admin-actions';
import { handleStripeWebhookEvent } from '@/server/services/stripe-service';

export async function POST(req: Request) {
    const body = await req.text();
    const signature = headers().get('Stripe-Signature') as string;

    const { apiKeys } = await getAdminSettings();
    const stripeWebhookSecret = apiKeys.stripeWebhookSecret;
    
    if (!apiKeys.stripeSecretKey || !stripeWebhookSecret) {
        console.error("Stripe secret key or webhook secret not configured.");
        return new NextResponse('Stripe is not configured by the administrator.', { status: 500 });
    }
    const stripe = new Stripe(apiKeys.stripeSecretKey, { apiVersion: '2024-06-20' });

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(body, signature, stripeWebhookSecret);
    } catch (err: any) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
    }
    
    console.log(`Received Stripe event: ${event.type}`);

    try {
        await handleStripeWebhookEvent(event);
    } catch (error) {
        console.error("Error processing webhook:", error);
        return new NextResponse('Webhook handler failed. See logs.', { status: 500 });
    }

    return new NextResponse(JSON.stringify({ received: true }), { status: 200 });
}
