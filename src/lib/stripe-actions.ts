'use server';

import { auth } from "@/auth";
import { 
    createCheckoutSession as createStripeCheckoutSession, 
    createCustomerPortalSession as createStripeCustomerPortalSession,
    isStripeConfigured 
} from "@/server/services/stripe-service";

/**
 * Creates a Stripe Checkout session for a given plan and billing cycle.
 * This is a server action safe to be called from client components.
 * Uses ONLY environment variables for Stripe configuration.
 */
export async function createCheckoutSession(planId: string, billingCycle: 'monthly' | 'quarterly' | 'yearly') {
    const session = await auth();
    if (!session?.user?.id) throw new Error("User not authenticated.");

    // Check if Stripe is configured via environment variables ONLY
    const configured = await isStripeConfigured();
    if (!configured) {
        throw new Error(
            "Stripe is not configured. " +
            "Please add STRIPE_SECRET_KEY to your environment variables."
        );
    }

    return createStripeCheckoutSession(session.user.id, planId, billingCycle);
}

/**
 * Creates a Stripe Customer Portal session for the current user.
 * This is a server action safe to be called from client components.
 * Uses ONLY environment variables for Stripe configuration.
 */
export async function createCustomerPortalSession() {
    const session = await auth();
    if (!session?.user?.id) throw new Error("User not authenticated.");
    
    // Check if Stripe is configured via environment variables ONLY
    const configured = await isStripeConfigured();
    if (!configured) {
        throw new Error(
            "Stripe is not configured. " +
            "Please add STRIPE_SECRET_KEY to your environment variables."
        );
    }

    return createStripeCustomerPortalSession(session.user.id);
}
