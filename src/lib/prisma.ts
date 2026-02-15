// CRITICAL FIX: Re-export from the consolidated Prisma client
// All Prisma imports should use @/server/prisma to ensure consistency
// This file exists for backwards compatibility with @/lib/prisma imports

// Use relative path to avoid module resolution issues
import prisma from '../server/prisma';
export default prisma;
