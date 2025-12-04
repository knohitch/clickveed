

import { NextResponse } from 'next/server';
import { Stripe } from 'stripe';
import prisma from '@/server/prisma';
import { getAdminSettings } from '@/server/actions/admin-actions';
import { auth } from '@/auth';

const getURL = () => {
    const url = process.env.NEXTAUTH_URL;
    if (!url) throw new Error("NEXTAUTH_URL environment variable is not set.");
    return url;
};

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

        const { apiKeys } = await getAdminSettings();
        if (!apiKeys.stripeSecretKey || !apiKeys.stripePublishableKey) {
            return NextResponse.json({ error: 'Stripe is not configured.' }, { status: 500 });
        }

        const stripe = new Stripe(apiKeys.stripeSecretKey, { apiVersion: '2024-06-20' });

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


        const checkoutSession = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            billing_address_collection: 'required',
            customer: stripeCustomerId,
            line_items: [{ price: stripePriceId, quantity: 1 }],
            mode: 'subscription',
            success_url: `${getURL()}/dashboard/settings?payment_success=true`,
            cancel_url: `${getURL()}/dashboard/settings`,
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
