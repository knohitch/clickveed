'use server';

import { Stripe } from 'stripe';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { handleStripeWebhookEvent } from '@/server/services/stripe-service';

export async function POST(req: Request) {
    const body = await req.text();
    const signature = headers().get('Stripe-Signature') as string;

    // Read Stripe configuration from environment variables ONLY
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!stripeSecretKey || !stripeWebhookSecret) {
        console.error("Stripe secret key or webhook secret not configured in environment variables.");
        return new NextResponse(
            'Stripe is not configured. Please add STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET to your environment variables.', 
            { status: 500 }
        );
    }

    // Create Stripe instance from environment variable only
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-06-20' });

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(body, signature, stripeWebhookSecret);
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error(`Webhook signature verification failed: ${errorMessage}`);
        return new NextResponse(`Webhook Error: ${errorMessage}`, { status: 400 });
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
