

'use server';

import { NextResponse } from 'next/server';
import { getAdminSettings } from '@/server/actions/admin-actions';
import { auth } from '@/auth';
import { createCustomerPortalSession as createStripeCustomerPortalSession, invalidateStripeCache } from '@/server/services/stripe-service';

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }
        
        // Check if Stripe is configured via env var (preferred) or admin settings
        const stripeConfigured = !!process.env.STRIPE_SECRET_KEY || !!((await getAdminSettings()).apiKeys.stripeSecretKey);
        if (!stripeConfigured) {
            return NextResponse.json({ error: 'Stripe is not configured.' }, { status: 500 });
        }

        // Invalidate cache to ensure fresh Stripe instance
        await invalidateStripeCache();

        const { url } = await createStripeCustomerPortalSession(session.user.id);
        
        return NextResponse.json({ url });

    } catch (error: any) {
        console.error("Stripe Portal Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
