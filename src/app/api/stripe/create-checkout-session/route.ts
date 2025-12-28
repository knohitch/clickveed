

import { NextResponse } from 'next/server';
import { Stripe } from 'stripe';
import prisma from '@/server/prisma';
import { getAdminSettings } from '@/server/actions/admin-actions';
import { auth } from '@/auth';
import { getBaseUrl } from '@/lib/utils';

// Cache for Stripe instance
let stripeInstance: Stripe | null = null;
let cachedStripeKey: string | null = null;

async function getStripe(): Promise<Stripe> {
    // Check environment variables first (most secure), then fall back to database
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY || (await getAdminSettings()).apiKeys.stripeSecretKey;
    
    if (!stripeSecretKey) {
        throw new Error('Stripe secret key not configured. Please add STRIPE_SECRET_KEY to environment variables.');
    }
    
    // Invalidate cache if key changed
    if (cachedStripeKey !== stripeSecretKey || !stripeInstance) {
        console.log('[Stripe Checkout] Creating new Stripe instance');
        stripeInstance = null;
        cachedStripeKey = stripeSecretKey;
    }
    
    if (!stripeInstance) {
        stripeInstance = new Stripe(stripeSecretKey, { apiVersion: '2024-06-20', typescript: true });
    }
    
    return stripeInstance;
}

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }
        const userId = session.user.id;

        const { planId, billingCycle } = await req.json();

        if (!planId || !billingCycle) {
            return NextResponse.json({ error: 'Missing planId or billingCycle' }, { status: 400 });
        }

        // Check if Stripe is configured via env var (preferred) or admin settings
        const stripeConfigured = !!process.env.STRIPE_SECRET_KEY || !!((await getAdminSettings()).apiKeys.stripeSecretKey);
        if (!stripeConfigured) {
            return NextResponse.json({ error: 'Stripe is not configured. Please add STRIPE_SECRET_KEY to environment variables or admin settings.' }, { status: 500 });
        }

        const stripe = await getStripe();

        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found.' }, { status: 404 });
        }

        let plan = await prisma.plan.findUnique({
            where: { id: planId },
        });

        if (!plan) {
            return NextResponse.json({ error: 'Plan not found.' }, { status: 404 });
        }

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
            default: return NextResponse.json({ error: 'Invalid billing cycle' }, { status: 400 });
        }

        const stripePriceId = plan[priceIdField];

        if (!stripePriceId) {
             return NextResponse.json({ error: `Stripe Price ID for ${billingCycle} cycle not found for this plan. Please re-save the plan in the admin panel.` }, { status: 500 });
        }


        const baseUrl = getBaseUrl(req);

        const checkoutSession = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            billing_address_collection: 'required',
            customer: stripeCustomerId,
            line_items: [{ price: stripePriceId, quantity: 1 }],
            mode: 'subscription',
            success_url: `${baseUrl}/dashboard/settings/billing?payment_success=true`,
            cancel_url: `${baseUrl}/dashboard/settings/billing`,
            metadata: {
                userId: userId,
                planId: planId,
                priceId: stripePriceId,
            },
        });

        return NextResponse.json({ sessionId: checkoutSession.id });

    } catch (error: any) {
        console.error("Stripe Checkout Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
