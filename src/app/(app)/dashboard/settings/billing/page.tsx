
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { AlertTriangle, CreditCard, User, ShieldQuestion, CheckCircle, Loader2, MessageSquare, HelpCircle } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useAdminSettings } from "@/contexts/admin-settings-context";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect, useMemo, useRef } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createCheckoutSession, createCustomerPortalSession } from "@/lib/stripe-actions";
import { loadStripe } from "@stripe/stripe-js";
import type { Plan } from "@/contexts/admin-settings-context";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

const calculateDiscountedPrice = (price: number, discountPercentage: number) => {
    return price * (1 - discountPercentage / 100);
}

type Provider = 'stripe' | 'paypal';

const PaymentProviderDialog = ({ plan, cycle, onSelectProvider, isRedirecting, availableProviders }: { plan: Plan, cycle: 'monthly' | 'quarterly' | 'yearly', onSelectProvider: (provider: Provider) => void, isRedirecting: boolean, availableProviders: Provider[] }) => {
    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Confirm Your Subscription</DialogTitle>
                <CardDescription>
                    You are subscribing to the <span className="font-bold text-primary">{plan.name}</span> plan on a <span className="font-bold text-primary">{cycle}</span> basis. Please choose your preferred payment method below.
                </CardDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
                {availableProviders.includes('stripe') && (
                     <Button
                        size="lg"
                        className="w-full"
                        onClick={() => onSelectProvider('stripe')}
                        disabled={isRedirecting}
                    >
                        {isRedirecting ? 'Processing...' : 'Pay with Stripe'}
                    </Button>
                )}
                {availableProviders.includes('paypal') && (
                    <Button
                        size="lg"
                        className="w-full bg-[#003087] hover:bg-[#00296b]"
                        onClick={() => onSelectProvider('paypal')}
                        disabled
                    >
                         {isRedirecting ? 'Processing...' : 'Pay with PayPal (Coming Soon)'}
                    </Button>
                )}
                 {availableProviders.length === 0 && (
                    <p className="text-sm text-center text-muted-foreground">No payment providers have been configured by the administrator. Please contact support.</p>
                )}
            </div>
        </DialogContent>
    )
}

export default function BillingPage() {
    const { currentUser, subscriptionPlan, userPlanDetails } = useAuth();
    const { plans, promotions, apiKeys } = useAdminSettings();
    const router = useRouter();
    const { toast } = useToast();
    
    const [isRedirecting, setIsRedirecting] = useState(false);
    
    const [billingCycles, setBillingCycles] = useState<Record<string, 'monthly' | 'quarterly' | 'yearly'>>({});
    const [isPaymentDialogOpen, setPaymentDialogOpen] = useState(false);
    const [selectedPlanForPayment, setSelectedPlanForPayment] = useState<Plan | null>(null);

    const availableProviders = useMemo((): Provider[] => {
        const providers: Provider[] = [];
        if (apiKeys.stripePublishableKey && apiKeys.stripeSecretKey) {
            providers.push('stripe');
        }
        return providers;
    }, [apiKeys]);
    

    const processPayment = async (planId: string, provider: Provider) => {
        if (!currentUser) {
            toast({ variant: 'destructive', title: "Authentication Error", description: "You must be logged in to subscribe." });
            return;
        }

        if (provider === 'stripe') {
            setIsRedirecting(true);
            try {
                const cycle = billingCycles[planId] || 'monthly';
                const { sessionId } = await createCheckoutSession(planId, cycle);
                const stripe = await loadStripe(apiKeys.stripePublishableKey);
                if (!stripe) throw new Error("Stripe.js failed to load.");
                const { error } = await stripe.redirectToCheckout({ sessionId });
                if (error) {
                    toast({ variant: 'destructive', title: "Checkout Error", description: error.message });
                }
            } catch (error: any) {
                toast({ variant: 'destructive', title: "Error", description: error.message });
            } finally {
                setIsRedirecting(false);
            }
        } else if (provider === 'paypal') {
            toast({ title: "PayPal Coming Soon", description: "PayPal integration is not yet implemented." });
        }
    }

    const handleChoosePlan = (plan: Plan) => {
        // Don't allow purchasing free plans
        if (plan.priceMonthly === 0) {
            toast({ variant: 'destructive', title: 'Invalid Selection', description: 'Free plan does not require payment.' });
            return;
        }

        if (availableProviders.length === 0) {
            toast({ variant: 'destructive', title: 'Payments Not Configured', description: 'No payment providers are available. Please contact support.' });
            return;
        }
        if (availableProviders.length === 1) {
            processPayment(plan.id, availableProviders[0]);
        } else {
            setSelectedPlanForPayment(plan);
            setPaymentDialogOpen(true);
        }
    }

    const handleManageBilling = async () => {
         if (!apiKeys.stripeSecretKey || !currentUser) {
            toast({ variant: 'destructive', title: "Configuration Error", description: "Payment processing is not configured or you are not logged in. Please contact support." });
            return;
        }
        setIsRedirecting(true);
        try {
            const { url } = await createCustomerPortalSession();
            router.push(url);
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Error", description: error.message });
        } finally {
            setIsRedirecting(false);
        }
    };
    
    const sortedPlans = useMemo(() => {
        if (!plans) return [];
        return [...plans].sort((a,b) => Number(a.priceMonthly) - Number(b.priceMonthly));
    }, [plans]);

    return (
        <div className="space-y-6">
            {userPlanDetails.hasActiveSubscription && (
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>Current Subscription</CardTitle>
                        <CardDescription>You have an active subscription. Manage your billing details or change your plan below.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center justify-between p-4 bg-muted rounded-lg">
                        <div>
                            <p className="font-bold">{subscriptionPlan?.name} Plan</p>
                            <p className="text-sm">Status: <Badge>{userPlanDetails.status}</Badge></p>
                            <p className="text-sm">Renews on: {userPlanDetails.renewsOn}</p>
                        </div>
                        <Button onClick={handleManageBilling} disabled={isRedirecting}>
                            {isRedirecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isRedirecting ? "Redirecting..." : "Manage Billing"}
                        </Button>
                    </CardContent>
                </Card>
            )}
             <Card>
                <CardHeader>
                    <CardTitle>Plans & Pricing</CardTitle>
                    <CardDescription>Choose the plan that's right for you.</CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {sortedPlans.map(plan => {
                        const activePromotion = promotions.find(p => p.isActive && p.applicablePlanIds.includes(plan.id));

                       const discountedMonthly = activePromotion ? calculateDiscountedPrice(plan.priceMonthly, activePromotion.discountPercentage) : plan.priceMonthly;
                       const discountedQuarterly = activePromotion ? calculateDiscountedPrice(plan.priceQuarterly, activePromotion.discountPercentage) : plan.priceQuarterly;
                       const discountedYearly = activePromotion ? calculateDiscountedPrice(plan.priceYearly, activePromotion.discountPercentage) : plan.priceYearly;

                       const selectedCycle = billingCycles[plan.id] || 'monthly';

                       return (
                        <Card key={plan.id} className="flex flex-col">
                            <CardHeader>
                                    <CardTitle>{plan.name}</CardTitle>
                                    <p className="text-3xl font-bold">
                                        ${(selectedCycle === 'monthly' ? discountedMonthly : selectedCycle === 'quarterly' ? discountedQuarterly : discountedYearly).toFixed(2)}
                                        {activePromotion && <span className="text-lg font-normal text-muted-foreground line-through ml-2">${(selectedCycle === 'monthly' ? plan.priceMonthly : selectedCycle === 'quarterly' ? plan.priceQuarterly : plan.priceYearly).toFixed(2)}</span>}
                                        <span className="text-sm font-normal text-muted-foreground">/{selectedCycle === 'quarterly' ? 'qtr' : selectedCycle.slice(0, 2)}</span>
                                    </p>
                                    <CardDescription>{plan.description}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1 space-y-3">
                                    <RadioGroup value={selectedCycle} onValueChange={(value) => setBillingCycles(prev => ({ ...prev, [plan.id]: value as 'monthly' | 'quarterly' | 'yearly' }))} className="grid grid-cols-1 gap-2">
                                        <Label className="flex items-center justify-between p-3 border rounded-md has-[:checked]:border-primary cursor-pointer">
                                            <div>
                                                <p className="font-semibold">Monthly</p>
                                                <p className="text-sm text-muted-foreground">${discountedMonthly.toFixed(2)} / month</p>
                                            </div>
                                            <RadioGroupItem value="monthly" />
                                        </Label>
                                        <Label className="flex items-center justify-between p-3 border rounded-md has-[:checked]:border-primary cursor-pointer">
                                            <div>
                                                <p className="font-semibold">Quarterly</p>
                                                <p className="text-sm text-muted-foreground">${discountedQuarterly.toFixed(2)} / quarter</p>
                                            </div>
                                            <RadioGroupItem value="quarterly" />
                                        </Label>
                                        <Label className="flex items-center justify-between p-3 border rounded-md has-[:checked]:border-primary cursor-pointer">
                                            <div>
                                                <p className="font-semibold">Yearly</p>
                                                <p className="text-sm text-muted-foreground">${discountedYearly.toFixed(2)} / year</p>
                                            </div>
                                            <RadioGroupItem value="yearly" />
                                        </Label>
                                    </RadioGroup>
                                    <Separator className="my-4" />
                                    {plan.features.map(feature => (
                                        <div key={feature.id} className="flex items-center gap-2">
                                            <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0"/>
                                            <span className="text-sm">{feature.text}</span>
                                        </div>
                                    ))}
                            </CardContent>
                            <CardFooter>
                                <Button
                                    className="w-full"
                                    disabled={subscriptionPlan?.id === plan.id || isRedirecting || plan.priceMonthly === 0}
                                    onClick={() => handleChoosePlan(plan)}
                                    variant={plan.priceMonthly === 0 ? "secondary" : "default"}
                                >
                                    {isRedirecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {subscriptionPlan?.id === plan.id ? 'Current Plan' :
                                     plan.priceMonthly === 0 ? 'Free Plan' :
                                     isRedirecting ? 'Processing...' : 'Choose Plan'}
                                </Button>
                            </CardFooter>
                        </Card>
                   )})}
                </CardContent>
            </Card>
             <Dialog open={isPaymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
                 {selectedPlanForPayment && (
                    <PaymentProviderDialog 
                        plan={selectedPlanForPayment}
                        cycle={billingCycles[selectedPlanForPayment.id] || 'monthly'}
                        onSelectProvider={(provider) => processPayment(selectedPlanForPayment.id, provider)}
                        isRedirecting={isRedirecting}
                        availableProviders={availableProviders}
                    />
                 )}
            </Dialog>
        </div>
    )
}
