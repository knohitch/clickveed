'use server';

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createCustomerPortalSession as createStripeCustomerPortalSession } from '@/server/services/stripe-service';
import { isStripeConfigured } from '@/server/services/stripe-service';

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }
        
        // Check if Stripe is configured via environment variables ONLY
        const configured = await isStripeConfigured();
        if (!configured) {
            return NextResponse.json({ 
                error: 'Stripe is not configured. Please add STRIPE_SECRET_KEY to your environment variables.' 
            }, { status: 500 });
        }

        const { url } = await createStripeCustomerPortalSession(session.user.id);
        
        return NextResponse.json({ url });

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error("Stripe Portal Error:", errorMessage);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
