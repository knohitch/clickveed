'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Edit, PlusCircle, Trash2, Search, Loader2, Database, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAdminSettings } from '@/contexts/admin-settings-context';
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
} from "@/components/ui/alert-dialog";
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    getAllFeatures,
    upsertFeature,
    deleteFeature,
    updatePlanFeatureAccess,
    seedDefaultFeatures,
    type FeatureDefinitionData
} from '@/server/actions/feature-management-actions';

const categoryOptions = [
    { value: 'video', label: 'Video' },
    { value: 'content', label: 'Content' },
    { value: 'audio', label: 'Audio' },
    { value: 'media', label: 'Media' },
    { value: 'automation', label: 'Automation' },
    { value: 'social', label: 'Social' },
    { value: 'settings', label: 'Settings' },
    { value: 'other', label: 'Other' },
];

type FeatureWithAccess = {
    id: string;
    featureId: string;
    displayName: string;
    description: string | null;
    category: string;
    isActive: boolean;
    planAccess: Array<{
        plan: { id: string; name: string };
    }>;
};

export default function FeaturesManagementPage() {
    const { toast } = useToast();
    const { plans } = useAdminSettings();
    const [features, setFeatures] = React.useState<FeatureWithAccess[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [saving, setSaving] = React.useState(false);
    const [seeding, setSeeding] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [categoryFilter, setCategoryFilter] = React.useState<string>('all');

    const [isFormOpen, setFormOpen] = React.useState(false);
    const [editingFeature, setEditingFeature] = React.useState<FeatureWithAccess | null>(null);
    const [featureToDelete, setFeatureToDelete] = React.useState<FeatureWithAccess | null>(null);

    // Form state
    const [formData, setFormData] = React.useState<FeatureDefinitionData>({
        featureId: '',
        displayName: '',
        description: '',
        category: 'other',
        isActive: true,
    });

    // Plan feature access state
    const [planFeatureMap, setPlanFeatureMap] = React.useState<Record<string, Set<string>>>({});

    const loadFeatures = React.useCallback(async () => {
        setLoading(true);
        try {
            const data = await getAllFeatures();
            setFeatures(data as FeatureWithAccess[]);

            // Build plan feature map
            const map: Record<string, Set<string>> = {};
            for (const plan of plans) {
                map[plan.id] = new Set();
            }
            for (const feature of data) {
                for (const access of feature.planAccess) {
                    if (map[access.plan.id]) {
                        map[access.plan.id].add(feature.featureId);
                    }
                }
            }
            setPlanFeatureMap(map);
        } catch (error) {
            console.error('Failed to load features:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to load features' });
        } finally {
            setLoading(false);
        }
    }, [plans, toast]);

    React.useEffect(() => {
        if (plans.length > 0) {
            loadFeatures();
        }
    }, [plans, loadFeatures]);

    const handleSeedFeatures = async () => {
        setSeeding(true);
        try {
            const result = await seedDefaultFeatures();
            if (result.success) {
                toast({ title: 'Success', description: result.message || 'Features seeded successfully' });
                await loadFeatures();
            } else {
                toast({ variant: 'destructive', title: 'Error', description: result.error || 'Failed to seed features' });
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to seed features' });
        } finally {
            setSeeding(false);
        }
    };

    const handleEdit = (feature: FeatureWithAccess) => {
        setEditingFeature(feature);
        setFormData({
            featureId: feature.featureId,
            displayName: feature.displayName,
            description: feature.description,
            category: feature.category,
            isActive: feature.isActive,
        });
        setFormOpen(true);
    };

    const handleAddNew = () => {
        setEditingFeature(null);
        setFormData({
            featureId: '',
            displayName: '',
            description: '',
            category: 'other',
            isActive: true,
        });
        setFormOpen(true);
    };

    const handleSaveFeature = async () => {
        if (!formData.featureId || !formData.displayName) {
            toast({ variant: 'destructive', title: 'Error', description: 'Feature ID and Display Name are required' });
            return;
        }

        setSaving(true);
        try {
            const result = await upsertFeature(formData);
            if (result.success) {
                toast({ title: 'Success', description: `Feature "${formData.displayName}" saved` });
                setFormOpen(false);
                await loadFeatures();
            } else {
                toast({ variant: 'destructive', title: 'Error', description: result.error || 'Failed to save feature' });
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to save feature' });
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteFeature = async () => {
        if (!featureToDelete) return;

        try {
            const result = await deleteFeature(featureToDelete.featureId);
            if (result.success) {
                toast({ title: 'Deleted', description: `Feature "${featureToDelete.displayName}" deleted` });
                await loadFeatures();
            } else {
                toast({ variant: 'destructive', title: 'Error', description: result.error || 'Failed to delete feature' });
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete feature' });
        } finally {
            setFeatureToDelete(null);
        }
    };

    const handleTogglePlanFeature = async (planId: string, featureId: string, checked: boolean) => {
        const newMap = { ...planFeatureMap };
        if (!newMap[planId]) {
            newMap[planId] = new Set();
        }

        if (checked) {
            newMap[planId].add(featureId);
        } else {
            newMap[planId].delete(featureId);
        }
        setPlanFeatureMap(newMap);

        // Save to database
        try {
            const result = await updatePlanFeatureAccess(planId, Array.from(newMap[planId]));
            if (!result.success) {
                toast({ variant: 'destructive', title: 'Error', description: 'Failed to update plan access' });
                // Revert on error
                await loadFeatures();
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to update plan access' });
            await loadFeatures();
        }
    };

    const filteredFeatures = features.filter(feature => {
        const matchesSearch = feature.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            feature.featureId.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = categoryFilter === 'all' || feature.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    const sortedPlans = React.useMemo(() => {
        return [...plans].sort((a, b) => Number(a.priceMonthly) - Number(b.priceMonthly));
    }, [plans]);

    if (loading) {
        return (
            <div className="space-y-8">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-10 w-64" />
                    <Skeleton className="h-10 w-32" />
                </div>
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-48" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-64 w-full" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-headline">Feature Management</h1>
                    <p className="text-muted-foreground">
                        Manage which features are available for each subscription plan.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleSeedFeatures} disabled={seeding}>
                        {seeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
                        Seed Defaults
                    </Button>
                    <Button variant="outline" onClick={loadFeatures}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Refresh
                    </Button>
                    <Button onClick={handleAddNew}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Feature
                    </Button>
                </div>
            </div>

            {features.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <Database className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No Features Found</h3>
                        <p className="text-muted-foreground text-center mb-4">
                            Click "Seed Defaults" to populate the database with the default features, or add features manually.
                        </p>
                        <Button onClick={handleSeedFeatures} disabled={seeding}>
                            {seeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
                            Seed Default Features
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle>Feature Access Matrix</CardTitle>
                        <CardDescription>
                            Check the boxes to grant access to each feature per plan. Changes are saved automatically.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col md:flex-row gap-4 mb-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search features..."
                                    className="pl-10"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                <SelectTrigger className="w-full md:w-48">
                                    <SelectValue placeholder="Filter by category" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Categories</SelectItem>
                                    {categoryOptions.map(opt => (
                                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="min-w-[200px]">Feature</TableHead>
                                        <TableHead className="w-24">Category</TableHead>
                                        <TableHead className="w-20">Active</TableHead>
                                        {sortedPlans.map(plan => (
                                            <TableHead key={plan.id} className="text-center min-w-[100px]">
                                                {plan.name}
                                            </TableHead>
                                        ))}
                                        <TableHead className="w-20">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredFeatures.map(feature => (
                                        <TableRow key={feature.id}>
                                            <TableCell>
                                                <div>
                                                    <div className="font-medium">{feature.displayName}</div>
                                                    <div className="text-xs text-muted-foreground font-mono">{feature.featureId}</div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="capitalize">{feature.category}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                {feature.isActive ? (
                                                    <Badge variant="default">Active</Badge>
                                                ) : (
                                                    <Badge variant="secondary">Inactive</Badge>
                                                )}
                                            </TableCell>
                                            {sortedPlans.map(plan => (
                                                <TableCell key={plan.id} className="text-center">
                                                    <Checkbox
                                                        checked={planFeatureMap[plan.id]?.has(feature.featureId) || false}
                                                        onCheckedChange={(checked) =>
                                                            handleTogglePlanFeature(plan.id, feature.featureId, checked as boolean)
                                                        }
                                                    />
                                                </TableCell>
                                            ))}
                                            <TableCell>
                                                <div className="flex gap-1">
                                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(feature)}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setFeatureToDelete(feature)}
                                                        className="text-destructive hover:text-destructive"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Feature Form Dialog */}
            <Dialog open={isFormOpen} onOpenChange={setFormOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingFeature ? 'Edit Feature' : 'Add New Feature'}</DialogTitle>
                        <DialogDescription>
                            {editingFeature ? 'Update the feature details.' : 'Create a new feature definition.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="featureId">Feature ID</Label>
                            <Input
                                id="featureId"
                                value={formData.featureId}
                                onChange={(e) => setFormData({ ...formData, featureId: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                                placeholder="e.g., video-suite"
                                disabled={!!editingFeature}
                            />
                            <p className="text-xs text-muted-foreground">
                                Unique identifier used in code. Use lowercase with hyphens.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="displayName">Display Name</Label>
                            <Input
                                id="displayName"
                                value={formData.displayName}
                                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                                placeholder="e.g., Video Suite"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Description (Optional)</Label>
                            <Input
                                id="description"
                                value={formData.description || ''}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Brief description of the feature"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="category">Category</Label>
                            <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {categoryOptions.map(opt => (
                                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="isActive"
                                checked={formData.isActive}
                                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked as boolean })}
                            />
                            <Label htmlFor="isActive">Feature is Active</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveFeature} disabled={saving}>
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Feature
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!featureToDelete} onOpenChange={(open) => !open && setFeatureToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Feature?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the "{featureToDelete?.displayName}" feature and remove it from all plans.
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteFeature} className="bg-destructive hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
