

'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, Trash2, Edit, TicketPercent, Check, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAdminSettings } from '@/contexts/admin-settings-context';
import type { Plan, Promotion } from '@/contexts/admin-settings-context';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

const PromotionForm = ({ promotion, plans, onSave, closeDialog }: { promotion: Partial<Promotion> | null, plans: Plan[], onSave: (promo: Promotion) => void, closeDialog: () => void }) => {
    const [name, setName] = React.useState(promotion?.name || '');
    const [discountPercentage, setDiscountPercentage] = React.useState(promotion?.discountPercentage ? Number(promotion.discountPercentage) : 10);
    const [applicablePlanIds, setApplicablePlanIds] = React.useState<string[]>(promotion?.applicablePlanIds || []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const finalPromotion: Promotion = {
            id: promotion?.id || `promo_${Date.now()}`,
            name,
            discountPercentage: Number(discountPercentage),
            isActive: promotion?.isActive ?? true,
            applicablePlanIds,
            createdAt: promotion?.createdAt || new Date(),
            updatedAt: new Date(),
        };
        onSave(finalPromotion);
        closeDialog();
    };
    
    const handlePlanToggle = (planId: string) => {
        setApplicablePlanIds(prev => 
            prev.includes(planId) ? prev.filter(id => id !== planId) : [...prev, planId]
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="promoName">Promotion Name</Label>
                <Input id="promoName" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Black Friday Sale" required />
            </div>
             <div className="space-y-2">
                <Label htmlFor="discountPercentage">Discount Percentage (%)</Label>
                <Input id="discountPercentage" type="number" value={discountPercentage} onChange={e => setDiscountPercentage(Number(e.target.value))} min="1" max="100" required />
            </div>
             <div className="space-y-2">
                <Label>Applicable Plans</Label>
                <div className="space-y-2 rounded-md border p-4">
                    {plans.length > 0 ? (
                        plans.map(plan => (
                            <div key={plan.id} className="flex items-center space-x-2">
                                <Checkbox 
                                    id={`plan-${plan.id}`}
                                    checked={applicablePlanIds.includes(plan.id)}
                                    onCheckedChange={() => handlePlanToggle(plan.id)}
                                />
                                <Label htmlFor={`plan-${plan.id}`}>{plan.name}</Label>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-muted-foreground">No paid plans available to apply promotions to.</p>
                    )}
                </div>
            </div>
            <DialogFooter>
                 <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
                 <Button type="submit">Save Promotion</Button>
            </DialogFooter>
        </form>
    );
};


export default function AdminPromotionsPage() {
    const { toast } = useToast();
    const { promotions, setPromotions, plans, loading } = useAdminSettings();
    const [isDialogOpen, setDialogOpen] = React.useState(false);
    const [editingPromotion, setEditingPromotion] = React.useState<Partial<Promotion> | null>(null);
    const [promoToDelete, setPromoToDelete] = React.useState<Promotion | null>(null);

    const handleEdit = (promo: Promotion) => {
        setEditingPromotion(promo);
        setDialogOpen(true);
    };
    
    const handleAddNew = () => {
        setEditingPromotion(null);
        setDialogOpen(true);
    };

    const handleDeleteClick = (promo: Promotion) => {
        setPromoToDelete(promo);
    }
    
    const confirmDelete = () => {
        if (!promoToDelete) return;
        setPromotions(promotions.filter(p => p.id !== promoToDelete.id));
        toast({ title: 'Promotion Deleted', description: 'The promotional discount has been removed.' });
        setPromoToDelete(null);
    };

    const handleSave = (promo: Promotion) => {
        const exists = promotions.some(p => p.id === promo.id);
        if (exists) {
            setPromotions(promotions.map(p => p.id === promo.id ? promo : p));
             toast({ title: 'Promotion Updated', description: `The ${promo.name} promotion has been saved.` });
        } else {
            setPromotions([...promotions, promo]);
            toast({ title: 'Promotion Created', description: `The ${promo.name} promotion has been added.` });
        }
    };
    
    const handleToggleActive = (promo: Promotion, isActive: boolean) => {
        const updatedPromo = { ...promo, isActive };
        setPromotions(promotions.map(p => p.id === promo.id ? updatedPromo : p));
        toast({ title: `Promotion ${isActive ? 'Activated' : 'Deactivated'}`, description: 'The change is now live.' });
    };
    
    const paidPlans = React.useMemo(() => plans.filter(p => Number(p.priceMonthly) > 0), [plans]);

    if (loading) {
         return (
            <div className="space-y-8">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-10 w-64" />
                    <Skeleton className="h-10 w-40" />
                </div>
                <Card>
                    <CardHeader><Skeleton className="h-8 w-1/3" /></CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                    </CardContent>
                </Card>
            </div>
         )
    }

    return (
        <AlertDialog>
            <div className="space-y-8">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold font-headline">Promotions</h1>
                        <p className="text-muted-foreground">
                            Create and manage discounts for promotional events.
                        </p>
                    </div>
                    <Button onClick={handleAddNew}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add New Promotion
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Active & Inactive Promotions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {promotions.length > 0 ? promotions.map(promo => (
                                <Card key={promo.id} className={cn(promo.isActive ? 'border-primary/50 bg-primary/5' : 'bg-muted/50')}>
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                        <div className={cn("p-3 rounded-full", promo.isActive ? "bg-primary/10" : "bg-muted")}>
                                            <TicketPercent className={cn("h-6 w-6", promo.isActive ? "text-primary" : "text-muted-foreground")} />
                                        </div>
                                            <div>
                                                <h3 className="font-semibold">{promo.name} - {Number(promo.discountPercentage)}% OFF</h3>
                                                <p className="text-sm text-muted-foreground">
                                                    Applies to: {promo.applicablePlanIds?.map(id => plans.find(p => p.id === id)?.name).filter(Boolean).join(', ') || 'No plans'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                        <div className="flex items-center space-x-2">
                                            <Switch 
                                                id={`active-${promo.id}`} 
                                                checked={promo.isActive}
                                                onCheckedChange={(checked) => handleToggleActive(promo, checked)}
                                            />
                                            <Label htmlFor={`active-${promo.id}`} className="text-sm">{promo.isActive ? 'Active' : 'Inactive'}</Label>
                                        </div>
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(promo)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(promo)}>
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </AlertDialogTrigger>
                                        </div>
                                    </CardContent>
                                </Card>
                        )) : (
                            <div className="text-center text-muted-foreground p-8 border-2 border-dashed rounded-md">
                                <TicketPercent className="mx-auto h-12 w-12 text-muted-foreground" />
                                <h3 className="mt-4 text-lg font-semibold">No Promotions Created</h3>
                                <p className="mt-1 text-sm">Click "Add New Promotion" to get started.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingPromotion ? 'Edit Promotion' : 'Create New Promotion'}</DialogTitle>
                            <DialogDescription>
                                Define the details for this discount.
                            </DialogDescription>
                        </DialogHeader>
                        <PromotionForm 
                            promotion={editingPromotion} 
                            plans={paidPlans}
                            onSave={handleSave} 
                            closeDialog={() => setDialogOpen(false)} 
                        />
                    </DialogContent>
                </Dialog>
            </div>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the <span className="font-bold">{promoToDelete?.name}</span> promotion.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setPromoToDelete(null)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
