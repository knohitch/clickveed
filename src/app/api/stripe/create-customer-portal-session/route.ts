

'use server';

import { NextResponse } from 'next/server';
import { getAdminSettings } from '@/server/actions/admin-actions';
import { auth } from '@/auth';
import { createCustomerPortalSession as createStripeCustomerPortalSession } from '@/server/services/stripe-service';

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }
        
        const { apiKeys } = await getAdminSettings();
        if (!apiKeys.stripeSecretKey) {
            return NextResponse.json({ error: 'Stripe is not configured.' }, { status: 500 });
        }

        const { url } = await createStripeCustomerPortalSession(session.user.id, apiKeys.stripeSecretKey);
        
        return NextResponse.json({ url });

    } catch (error: any) {
        console.error("Stripe Portal Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
