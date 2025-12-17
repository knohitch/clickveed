
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
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
  refreshing: boolean;
  updateUserDisplayName: (name: string) => Promise<void>;
  refreshUser: () => Promise<void>;
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
  const [refreshing, setRefreshing] = useState(false);

  const loadUserAndPlan = useCallback(async (userId: string) => {
    const userDetails = await getUserById(userId);
    setCurrentUser(userDetails);
    if (userDetails?.plan) {
      setSubscriptionPlan(userDetails.plan);
    } else {
      setSubscriptionPlan(null);
    }
    return userDetails;
  }, []);

  useEffect(() => {
    async function initializeUser() {
      if (status === 'authenticated' && session?.user?.id) {
        setLoading(true);
        await loadUserAndPlan(session.user.id);
        setLoading(false);
      } else if (status !== 'loading') {
        setLoading(false);
      }
    }
    initializeUser();
  }, [session, status, loadUserAndPlan]);

  // Refresh user data from database (useful after payment, plan changes, etc.)
  const refreshUser = useCallback(async () => {
    if (!session?.user?.id) return;
    setRefreshing(true);
    try {
      await loadUserAndPlan(session.user.id);
    } finally {
      setRefreshing(false);
    }
  }, [session?.user?.id, loadUserAndPlan]);

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
    refreshing,
    updateUserDisplayName,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
