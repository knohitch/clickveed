
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { getUserById } from '@/server/actions/user-actions';
import type { Plan } from '@prisma/client';
import { format } from 'date-fns';

interface AuthContextType {
  currentUser: UserWithPlan | null;
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

interface UserWithPlan {
  id: string;
  email: string | null;
  displayName: string | null;
  role: string;
  status: string;
  emailVerified: boolean | null;
  planId: string | null;
  stripeSubscriptionStatus: string | null;
  stripeCurrentPeriodEnd: Date | null;
  plan: Plan | null;
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
  const [currentUser, setCurrentUser] = useState<UserWithPlan | null>(null);
  const [subscriptionPlan, setSubscriptionPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadUserAndPlan = useCallback(async (userId: string) => {
    try {
      console.log('[AuthContext] Loading user data for:', userId);
      const userDetails = await getUserById(userId);
      console.log('[AuthContext] Loaded user details:', userDetails ? { id: userDetails.id, plan: userDetails.plan?.name, planId: userDetails.planId } : 'null');
      setCurrentUser(userDetails);
      if (userDetails?.plan) {
        setSubscriptionPlan(userDetails.plan);
        console.log('[AuthContext] Set subscription plan:', userDetails.plan.name);
      } else {
        console.log('[AuthContext] No plan found for user, setting to null');
        setSubscriptionPlan(null);
      }
      return userDetails;
    } catch (error) {
      console.error('[AuthContext] Error loading user:', error);
      return null;
    }
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

  const updateUserDisplayName = async (displayName: string) => {
    if (!currentUser) throw new Error("User not authenticated.");
    
    // Optimistic UI update - use displayName (matching User model field)
    setCurrentUser((prev: UserWithPlan | null) => prev ? { ...prev, displayName } : null);
    
    // Update the session, which is what the UI primarily uses
    await updateSession({ name: displayName });

    // Persist to backend (this is now a background task from the user's perspective)
    // In a real app, handle potential errors from this call.
    fetch(`/api/user/${currentUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: displayName }), // API expects 'name', maps to displayName
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
