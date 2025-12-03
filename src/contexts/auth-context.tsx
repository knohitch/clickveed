
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { getUserById } from '@/server/actions/user-actions';
import type { Plan } from '@prisma/client';
import { format } from 'date-fns';

interface AuthContextType {
  currentUser: any | null; // Replace 'any' with a proper User type if you have one
  subscriptionPlan: Plan | null;
  userPlanDetails: {
    hasActiveSubscription: boolean;
    status: string;
    renewsOn: string;
  };
  loading: boolean;
  updateUserDisplayName: (name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, status, update: updateSession } = useSession();
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [subscriptionPlan, setSubscriptionPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUserAndPlan() {
      if (status === 'authenticated' && session?.user?.id) {
        setLoading(true);
        const userDetails = await getUserById(session.user.id);
        setCurrentUser(userDetails);
        if (userDetails?.plan) {
          setSubscriptionPlan(userDetails.plan);
        }
        setLoading(false);
      } else if (status !== 'loading') {
        setLoading(false);
      }
    }
    loadUserAndPlan();
  }, [session, status]);

  const updateUserDisplayName = async (name: string) => {
    if (!currentUser) throw new Error("User not authenticated.");
    
    // Optimistic UI update
    setCurrentUser((prev: any) => ({ ...prev, name }));
    
    // Update the session, which is what the UI primarily uses
    await updateSession({ name });

    // Persist to backend (this is now a background task from the user's perspective)
    // In a real app, handle potential errors from this call.
    fetch(`/api/user/${currentUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
    });
  };

  const userPlanDetails = {
    hasActiveSubscription: !!(subscriptionPlan && subscriptionPlan.priceMonthly > 0 && currentUser?.stripeSubscriptionStatus === 'active'),
    status: currentUser?.stripeSubscriptionStatus || 'Free',
    renewsOn: currentUser?.stripeCurrentPeriodEnd ? format(new Date(currentUser.stripeCurrentPeriodEnd), 'MMMM dd, yyyy') : 'N/A',
  }

  const value = {
    currentUser,
    subscriptionPlan,
    userPlanDetails,
    loading,
    updateUserDisplayName,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
