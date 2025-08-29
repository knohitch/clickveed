

"use client";

import { useAuth } from "@/contexts/auth-context";
import type { Plan } from "@/contexts/admin-settings-context";
import { cn } from "@/lib/utils";
import { Lock, Star } from "lucide-react";
import { Button } from "./ui/button";
import Link from "next/link";
import { Skeleton } from "./ui/skeleton";

type PlanName = Plan['name'];

interface FeatureLockProps {
  children: React.ReactNode;
  requiredPlan: PlanName;
  featureName: string;
  className?: string;
}

const planHierarchy: Record<string, number> = {
    'Free': 0,
    'Pro': 1,
    'Enterprise': 2,
};

export function FeatureLock({ children, requiredPlan, className, featureName }: FeatureLockProps) {
    const { subscriptionPlan, loading } = useAuth();
    
    if (loading) {
        return <Skeleton className="w-full h-96" />;
    }

    // If there's no plan, assume 'Free' plan.
    const userLevel = subscriptionPlan ? planHierarchy[subscriptionPlan.name as PlanName] : 0;
    const requiredLevel = planHierarchy[requiredPlan];

    // If a plan doesn't exist in hierarchy (custom plan), deny access by default for safety.
    if (userLevel === undefined || requiredLevel === undefined) {
      return (
         <div className={cn("relative", className)}>
            <div className="blur-sm grayscale pointer-events-none select-none">
                {children}
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/70 rounded-lg">
                <div className="p-6 bg-background/90 border rounded-xl shadow-lg text-center flex flex-col items-center">
                    <p className="font-bold text-lg text-destructive">Configuration Error</p>
                    <p className="text-muted-foreground text-sm">Plan '{requiredPlan}' not recognized.</p>
                </div>
            </div>
        </div>
      )
    }

    const hasAccess = userLevel >= requiredLevel;

    if (hasAccess) {
        return <>{children}</>;
    }

    return (
        <div className={cn("relative", className)}>
            <div className="blur-sm grayscale pointer-events-none select-none">
                {children}
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/70 rounded-lg">
                <div className="p-6 bg-background/90 border rounded-xl shadow-lg text-center flex flex-col items-center">
                    <div className="p-3 mb-2 rounded-full bg-primary/10">
                         <Lock className="h-6 w-6 text-primary" />
                    </div>
                    <p className="font-bold text-lg">{featureName}</p>
                    <p className="text-muted-foreground text-sm mb-4">
                        This feature requires the '{requiredPlan}' plan or higher.
                    </p>
                    <Button asChild>
                       <Link href="/dashboard/settings">
                           <Star className="mr-2 h-4 w-4" /> Upgrade Plan
                       </Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}
