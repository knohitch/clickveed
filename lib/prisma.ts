// CRITICAL FIX: Re-export from the consolidated Prisma client
// All Prisma imports should use @/server/prisma to ensure consistency
// This file exists for backwards compatibility with @lib/prisma imports

// Use relative path to avoid circular dependency issues
import prisma from '../src/server/prisma';
export default prisma;
