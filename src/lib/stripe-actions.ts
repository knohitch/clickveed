

'use server';

import { auth } from "@/auth";
import { getAdminSettings } from "@/server/actions/admin-actions";
import { createCheckoutSession as createStripeCheckoutSession, createCustomerPortalSession as createStripeCustomerPortalSession, invalidateStripeCache } from "@/server/services/stripe-service";


/**
 * Creates a Stripe Checkout session for a given plan and billing cycle.
 * This is a server action safe to be called from client components.
 */
export async function createCheckoutSession(planId: string, billingCycle: 'monthly' | 'quarterly' | 'yearly') {
    const session = await auth();
    if (!session?.user?.id) throw new Error("User not authenticated.");

    // Check if Stripe is configured via env var (preferred) or admin settings
    const stripeConfigured = !!process.env.STRIPE_SECRET_KEY || !!((await getAdminSettings()).apiKeys.stripeSecretKey);
    if (!stripeConfigured) {
        throw new Error("Stripe is not configured. Please add STRIPE_SECRET_KEY to environment variables or admin settings.");
    }

    // Invalidate cache to ensure fresh Stripe instance
    await invalidateStripeCache();

    return createStripeCheckoutSession(session.user.id, planId, billingCycle);
}

/**
 * Creates a Stripe Customer Portal session for the current user.
 * This is a server action safe to be called from client components.
 */
export async function createCustomerPortalSession() {
    const session = await auth();
    if (!session?.user?.id) throw new Error("User not authenticated.");
    
    // Check if Stripe is configured via env var (preferred) or admin settings
    const stripeConfigured = !!process.env.STRIPE_SECRET_KEY || !!((await getAdminSettings()).apiKeys.stripeSecretKey);
    if (!stripeConfigured) {
        throw new Error('Stripe is not configured. Please add STRIPE_SECRET_KEY to environment variables or admin settings.');
    }

    // Invalidate cache to ensure fresh Stripe instance
    await invalidateStripeCache();

    return createStripeCustomerPortalSession(session.user.id);
}
