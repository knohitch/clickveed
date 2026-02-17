

'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Check, Edit, Package, PlusCircle, Trash2, Star } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAdminSettings } from '@/contexts/admin-settings-context';
import type { Plan, PlanFeature } from '@/contexts/admin-settings-context';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const PlanCard = ({ plan, onEdit, onDelete, isPopular, isDeletable }: { plan: Plan; onEdit: (plan: Plan) => void; onDelete: (planId: string) => void, isPopular: boolean, isDeletable: boolean }) => {
    
    const [billingCycle, setBillingCycle] = React.useState('monthly');
    let displayPrice;
    switch(billingCycle) {
        case 'quarterly':
            displayPrice = plan.priceQuarterly;
            break;
        case 'yearly':
            displayPrice = plan.priceYearly;
            break;
        default:
            displayPrice = plan.priceMonthly;
    }

    return (
        <Card className={cn("flex flex-col border-2", isPopular ? "border-primary" : "border-border")}>
            {isPopular && (
                 <div className="py-1.5 px-4 bg-primary text-primary-foreground text-sm font-semibold text-center rounded-t-lg -m-px">
                    Most Popular
                </div>
            )}
            <CardHeader className="pt-6">
                <div className="flex justify-between items-start">
                    <CardTitle className="text-2xl font-bold flex items-center gap-2">
                        {plan.name}
                    </CardTitle>
                    <div className="flex gap-1 -mt-2 -mr-2">
                         <Button variant="ghost" size="icon" onClick={() => onEdit(plan)}>
                            <Edit className="h-4 w-4" />
                        </Button>
                         <AlertDialogTrigger asChild>
                             <Button variant="ghost" size="icon" onClick={() => onDelete(plan.id)} disabled={!isDeletable}>
                                <Trash2 className={cn("h-4 w-4", isDeletable && "text-destructive")} />
                            </Button>
                         </AlertDialogTrigger>
                    </div>
                </div>
                <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
             <CardContent className="flex-1 space-y-4">
                <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-extrabold">${Number(displayPrice).toFixed(2)}</span>
                    <span className="text-muted-foreground">/{billingCycle === 'monthly' ? 'mo' : billingCycle === 'quarterly' ? 'qtr' : 'yr'}</span>
                </div>
                
                <RadioGroup defaultValue="monthly" onValueChange={setBillingCycle} className="grid grid-cols-1 gap-2">
                    <Label className="flex items-center justify-between p-3 border rounded-md has-[:checked]:border-primary cursor-pointer text-sm">
                        <div>
                            <p className="font-semibold">Monthly</p>
                            <p className="text-xs text-muted-foreground">${Number(plan.priceMonthly).toFixed(2)} / month</p>
                        </div>
                        <RadioGroupItem value="monthly" />
                    </Label>
                    <Label className="flex items-center justify-between p-3 border rounded-md has-[:checked]:border-primary cursor-pointer text-sm">
                            <div>
                            <p className="font-semibold">Quarterly</p>
                            <p className="text-xs text-muted-foreground">${Number(plan.priceQuarterly).toFixed(2)} / quarter</p>
                        </div>
                        <RadioGroupItem value="quarterly" />
                    </Label>
                    <Label className="flex items-center justify-between p-3 border rounded-md has-[:checked]:border-primary cursor-pointer text-sm">
                        <div>
                            <p className="font-semibold">Yearly</p>
                            <p className="text-xs text-muted-foreground">${Number(plan.priceYearly).toFixed(2)} / year</p>
                        </div>
                        <RadioGroupItem value="yearly" />
                    </Label>
                </RadioGroup>

                <Separator/>

                <div className="text-xs text-muted-foreground space-y-1 pt-1">
                    <p>Video Exports: <span className="font-medium text-foreground">{plan.videoExports ?? 'Unlimited'}</span></p>
                    <p>AI Credits: <span className="font-medium text-foreground">{plan.aiCredits ?? 'Unlimited'}</span></p>
                    <p>Storage: <span className="font-medium text-foreground">{plan.storageGB ? `${plan.storageGB} GB` : 'Unlimited'}</span></p>
                </div>

                <Separator/>

                <ul className="space-y-3 pt-2">
                    {plan.features.map((feature, index) => (
                        <li key={`${plan.id}-feature-${index}`} className="flex items-start gap-3">
                            <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                            <span className="text-sm">{feature.text}</span>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    );
};

const featureTierOptions = [
    { value: 'free', label: 'Free - Basic features only' },
    { value: 'starter', label: 'Starter - Includes analytics & brand kit' },
    { value: 'professional', label: 'Professional - Voice, video generation & AI agents' },
    { value: 'enterprise', label: 'Enterprise - All features including voice cloning' },
];

const PlanForm = ({ plan, onSave, onCancel }: { plan: Partial<Plan> | null, onSave: (plan: Plan) => void, onCancel: () => void }) => {
    const { toast } = useToast();
    const [name, setName] = React.useState(plan?.name || '');
    const [description, setDescription] = React.useState(plan?.description || '');
    const [priceMonthly, setPriceMonthly] = React.useState(plan?.priceMonthly ? String(plan.priceMonthly) : '0');
    const [priceQuarterly, setPriceQuarterly] = React.useState(plan?.priceQuarterly ? String(plan.priceQuarterly) : '0');
    const [priceYearly, setPriceYearly] = React.useState(plan?.priceYearly ? String(plan.priceYearly) : '0');
    const [featureTier, setFeatureTier] = React.useState((plan as any)?.featureTier || 'free');
    const [stripePriceIdMonthly, setStripePriceIdMonthly] = React.useState(plan?.stripePriceIdMonthly || '');
    const [stripePriceIdQuarterly, setStripePriceIdQuarterly] = React.useState(plan?.stripePriceIdQuarterly || '');
    const [stripePriceIdYearly, setStripePriceIdYearly] = React.useState(plan?.stripePriceIdYearly || '');
    const [featureItems, setFeatureItems] = React.useState<string[]>(plan?.features?.map(f => f.text) || []);
    const [videoExports, setVideoExports] = React.useState(plan?.videoExports != null ? String(plan.videoExports) : '');
    const [aiCredits, setAiCredits] = React.useState(plan?.aiCredits != null ? String(plan.aiCredits) : '');
    const [storageGB, setStorageGB] = React.useState(plan?.storageGB != null ? String(plan.storageGB) : '');

    const addFeature = () => {
        setFeatureItems([...featureItems, '']);
    };

    const removeFeature = (index: number) => {
        setFeatureItems(featureItems.filter((_, i) => i !== index));
    };

    const updateFeature = (index: number, value: string) => {
        const updated = [...featureItems];
        updated[index] = value;
        setFeatureItems(updated);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validation: Check if paid plan has Stripe Price IDs
        const isPaidPlan = Number(priceMonthly) > 0 || Number(priceQuarterly) > 0 || Number(priceYearly) > 0;
        
        if (isPaidPlan) {
            const missingStripeIds = [];
            if (!stripePriceIdMonthly?.trim()) missingStripeIds.push('Monthly');
            if (!stripePriceIdQuarterly?.trim()) missingStripeIds.push('Quarterly');
            if (!stripePriceIdYearly?.trim()) missingStripeIds.push('Yearly');
            
            if (missingStripeIds.length > 0) {
                toast({
                    variant: 'destructive',
                    title: 'Missing Stripe Price IDs',
                    description: `Paid plans require Stripe Price IDs for: ${missingStripeIds.join(', ')}. Get these from your Stripe Dashboard → Products → Price IDs.`,
                });
                return;
            }
            
            // Validate Stripe Price ID format (starts with price_)
            const invalidStripeIds = [];
            if (stripePriceIdMonthly && !stripePriceIdMonthly.startsWith('price_')) invalidStripeIds.push('Monthly');
            if (stripePriceIdQuarterly && !stripePriceIdQuarterly.startsWith('price_')) invalidStripeIds.push('Quarterly');
            if (stripePriceIdYearly && !stripePriceIdYearly.startsWith('price_')) invalidStripeIds.push('Yearly');
            
            if (invalidStripeIds.length > 0) {
                toast({
                    variant: 'destructive',
                    title: 'Invalid Stripe Price ID Format',
                    description: `Stripe Price IDs for ${invalidStripeIds.join(', ')} must start with "price_" (e.g., price_1PqR9t2eZvKYlo2C4p6zQwLf).`,
                });
                return;
            }
        }

        const planId = plan?.id || `plan_${Date.now()}`;
        const newFeaturesList = featureItems.filter(f => f.trim() !== '');

        const finalFeatures: PlanFeature[] = newFeaturesList.map((text, index) => {
            const existingFeature = plan?.features?.find(f => f.text === text) ?? plan?.features?.[index];
            return {
                id: existingFeature?.id || `${planId}_feat_${Date.now()}_${index}`,
                text: text,
                planId: planId,
            };
        });

        const finalPlan: Plan = {
            id: planId,
            name,
            description,
            priceMonthly: Number(priceMonthly),
            priceQuarterly: Number(priceQuarterly),
            priceYearly: Number(priceYearly),
            featureTier: featureTier,
            features: finalFeatures,
            createdAt: plan?.createdAt || new Date(),
            updatedAt: new Date(),
            videoExports: videoExports.trim() !== '' ? Number(videoExports) : null,
            aiCredits: aiCredits.trim() !== '' ? Number(aiCredits) : null,
            storageGB: storageGB.trim() !== '' ? Number(storageGB) : null,
            stripeProductId: plan?.stripeProductId ?? null,
            stripePriceIdMonthly: stripePriceIdMonthly || null,
            stripePriceIdQuarterly: stripePriceIdQuarterly || null,
            stripePriceIdYearly: stripePriceIdYearly || null,
        } as Plan;
        onSave(finalPlan);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            <div className="space-y-2">
                <Label htmlFor="planName">Plan Name</Label>
                <Input id="planName" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="A short description of this plan." required />
            </div>
            <div className="space-y-2">
                <Label htmlFor="featureTier">Feature Access Tier</Label>
                <Select value={featureTier} onValueChange={setFeatureTier}>
                    <SelectTrigger id="featureTier">
                        <SelectValue placeholder="Select feature tier" />
                    </SelectTrigger>
                    <SelectContent>
                        {featureTierOptions.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Determines which features users on this plan can access.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="priceMonthly">Monthly Price ($)</Label>
                    <Input id="priceMonthly" type="number" step="0.01" min="0" value={priceMonthly} onChange={e => setPriceMonthly(e.target.value)} required />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="priceQuarterly">Quarterly Price ($)</Label>
                    <Input id="priceQuarterly" type="number" step="0.01" min="0" value={priceQuarterly} onChange={e => setPriceQuarterly(e.target.value)} required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="priceYearly">Yearly Price ($)</Label>
                    <Input id="priceYearly" type="number" step="0.01" min="0" value={priceYearly} onChange={e => setPriceYearly(e.target.value)} required />
                </div>
            </div>
            <Separator />
            <div className="space-y-2">
                <Label className="text-sm font-semibold">Usage Limits</Label>
                <p className="text-xs text-muted-foreground mb-2">Leave empty for unlimited. These limits control how much users on this plan can use.</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="videoExports">Video Exports</Label>
                        <Input id="videoExports" type="number" min="0" step="1" value={videoExports} onChange={e => setVideoExports(e.target.value)} placeholder="Unlimited" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="aiCredits">AI Credits</Label>
                        <Input id="aiCredits" type="number" min="0" step="1" value={aiCredits} onChange={e => setAiCredits(e.target.value)} placeholder="Unlimited" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="storageGB">Storage (GB)</Label>
                        <Input id="storageGB" type="number" min="0" step="1" value={storageGB} onChange={e => setStorageGB(e.target.value)} placeholder="Unlimited" />
                    </div>
                </div>
            </div>
            <Separator />
            <div className="space-y-2">
                <Label className="text-sm font-semibold">Stripe Price IDs</Label>
                <p className="text-xs text-muted-foreground mb-2">Required for payments. Get these from your Stripe Dashboard → Products → Price IDs.</p>
                <div className="grid grid-cols-1 gap-3">
                    <div className="space-y-1">
                        <Label htmlFor="stripePriceIdMonthly" className="text-xs">Monthly Price ID</Label>
                        <Input id="stripePriceIdMonthly" value={stripePriceIdMonthly} onChange={e => setStripePriceIdMonthly(e.target.value)} placeholder="price_..." />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="stripePriceIdQuarterly" className="text-xs">Quarterly Price ID</Label>
                        <Input id="stripePriceIdQuarterly" value={stripePriceIdQuarterly} onChange={e => setStripePriceIdQuarterly(e.target.value)} placeholder="price_..." />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="stripePriceIdYearly" className="text-xs">Yearly Price ID</Label>
                        <Input id="stripePriceIdYearly" value={stripePriceIdYearly} onChange={e => setStripePriceIdYearly(e.target.value)} placeholder="price_..." />
                    </div>
                </div>
            </div>
            <Separator />
             <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <Label htmlFor="features" className="text-sm font-semibold">Features</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addFeature}>
                        <PlusCircle className="h-3.5 w-3.5 mr-1" />
                        Add Feature
                    </Button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                    {featureItems.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic">No features added yet. Click "Add Feature" to start.</p>
                    ) : (
                        featureItems.map((feature, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <Input
                                    value={feature}
                                    onChange={e => updateFeature(index, e.target.value)}
                                    placeholder={`Feature ${index + 1}`}
                                    className="flex-1"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeFeature(index)}
                                    className="h-9 w-9 text-destructive hover:text-destructive"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))
                    )}
                </div>
                <p className="text-xs text-muted-foreground">Each feature will be displayed as a bullet point in the plan card.</p>
            </div>
            <DialogFooter>
                 <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
                 <Button type="submit">Save Plan</Button>
            </DialogFooter>
        </form>
    )
}

export default function AdminPlansPage() {
    const { toast } = useToast();
    const { plans, setPlans, loading } = useAdminSettings();
    const [isFormOpen, setFormOpen] = React.useState(false);
    const [editingPlan, setEditingPlan] = React.useState<Partial<Plan> | null>(null);
    const [planToDelete, setPlanToDelete] = React.useState<Plan | null>(null);

    const handleEdit = (plan: Plan) => {
        setEditingPlan(plan);
        setFormOpen(true);
    };
    
    const handleAddNew = () => {
        setEditingPlan(null);
        setFormOpen(true);
    };

    const handleDeleteClick = (planId: string) => {
        const plan = plans.find(p => p.id === planId);
        if (plan) {
            setPlanToDelete(plan);
        }
    }
    
    const confirmDelete = () => {
        if (!planToDelete) return;

        if (planToDelete.name === 'Free' || planToDelete.name === 'Pro') {
            toast({
                variant: 'destructive',
                title: 'Deletion Prevented',
                description: `The "${planToDelete.name}" plan is a core plan and cannot be deleted.`
            });
            setPlanToDelete(null);
            return;
        }

        setPlans(plans.filter(p => p.id !== planToDelete.id));
        toast({ title: 'Plan Deleted', description: 'The subscription plan has been removed.' });
        setPlanToDelete(null);
    };

    const handleSave = (plan: Plan) => {
        const exists = plans.some(p => p.id === plan.id);
        if (exists) {
            setPlans(plans.map(p => p.id === plan.id ? plan : p));
             toast({ title: 'Plan Updated', description: `The ${plan.name} plan has been saved.` });
        } else {
            setPlans([...plans, plan]);
            toast({ title: 'Plan Created', description: `The ${plan.name} plan has been added.` });
        }
        setFormOpen(false);
        setEditingPlan(null);
    };
    
    const sortedPlans = React.useMemo(() => {
        if (!plans) return [];
        return [...plans].sort((a, b) => Number(a.priceMonthly) - Number(b.priceMonthly));
    }, [plans]);

    if (loading) {
        return (
             <div className="space-y-8">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-10 w-64" />
                    <Skeleton className="h-10 w-32" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-start">
                   {Array.from({length: 3}).map((_, i) => (
                        <Card key={i} className="space-y-4">
                            <CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader>
                            <CardContent className="space-y-4">
                                <Skeleton className="h-12 w-3/4" />
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-px w-full" />
                                <Skeleton className="h-6 w-full" />
                                <Skeleton className="h-6 w-full" />
                            </CardContent>
                        </Card>
                   ))}
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-headline">Subscription Plans</h1>
                    <p className="text-muted-foreground">
                        Create, edit, and manage your subscription tiers.
                    </p>
                </div>
                <Button onClick={handleAddNew}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add New Plan
                </Button>
            </div>

             <AlertDialog open={!!planToDelete} onOpenChange={(isOpen) => !isOpen && setPlanToDelete(null)}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-start">
                    {sortedPlans.map(plan => (
                        <PlanCard 
                            key={plan.id} 
                            plan={plan} 
                            onEdit={handleEdit} 
                            onDelete={handleDeleteClick} 
                            isPopular={plan.name === 'Pro'}
                            isDeletable={plan.name !== 'Free' && plan.name !== 'Pro'}
                        />
                    ))}
                </div>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the <span className="font-bold">{planToDelete?.name}</span> plan. 
                            This action cannot be undone and may affect existing subscribers.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setPlanToDelete(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
                            Yes, Delete Plan
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
             </AlertDialog>

            <Dialog open={isFormOpen} onOpenChange={setFormOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingPlan ? 'Edit Plan' : 'Create New Plan'}</DialogTitle>
                        <DialogDescription>
                            Define the details for this subscription tier.
                        </DialogDescription>
                    </DialogHeader>
                    <PlanForm plan={editingPlan} onSave={handleSave} onCancel={() => setFormOpen(false)} />
                </DialogContent>
            </Dialog>
        </div>
    );
}
