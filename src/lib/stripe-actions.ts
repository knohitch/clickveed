

'use server';

import { auth } from "@/auth";
import { getAdminSettings } from "@/server/actions/admin-actions";
import { createCheckoutSession as createStripeCheckoutSession, createCustomerPortalSession as createStripeCustomerPortalSession } from "@/server/services/stripe-service";


/**
 * Creates a Stripe Checkout session for a given plan and billing cycle.
 * This is a server action safe to be called from client components.
 */
export async function createCheckoutSession(planId: string, billingCycle: 'monthly' | 'quarterly' | 'yearly') {
    const session = await auth();
    if (!session?.user?.id) throw new Error("User not authenticated.");

    const { apiKeys } = await getAdminSettings();
    if (!apiKeys.stripeSecretKey || !apiKeys.stripePublishableKey) {
        throw new Error("Stripe is not configured by the administrator.");
    }

    return createStripeCheckoutSession(session.user.id, planId, billingCycle, apiKeys.stripeSecretKey);
}

/**
 * Creates a Stripe Customer Portal session for the current user.
 * This is a server action safe to be called from client components.
 */
export async function createCustomerPortalSession() {
    const session = await auth();
    if (!session?.user?.id) throw new Error("User not authenticated.");
    
    const { apiKeys } = await getAdminSettings();
    if (!apiKeys.stripeSecretKey) {
        throw new Error('Stripe is not configured by the administrator.');
    }

    return createStripeCustomerPortalSession(session.user.id, apiKeys.stripeSecretKey);
}
