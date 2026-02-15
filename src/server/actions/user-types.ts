/**
 * @fileOverview Type definitions for user-related server actions.
 * This file contains all types that are exported from user-actions.ts.
 * 
 * IMPORTANT: This file does NOT have 'use server' directive because it exports
 * types and interfaces, which cannot be exported from server action files.
 */

import type { User } from '@prisma/client';

// ============================================================================
// USER TYPES
// ============================================================================

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'USER';
export type UserStatus = 'Active' | 'Pending';

export type UserWithRole = Partial<User> & {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    emailVerified?: boolean | null;
    role: UserRole;
    status: UserStatus;
    plan?: string;
};

// ============================================================================
// BRAND KIT TYPES
// ============================================================================

export interface BrandKit {
    logoUrl?: string | null;
    primaryColor?: string | null;
    secondaryColor?: string | null;
    accentColor?: string | null;
    headlineFont?: string | null;
    bodyFont?: string | null;
}
