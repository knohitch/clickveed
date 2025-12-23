import prisma from '@lib/prisma';

// Fix Bug #3: Consolidate to single Prisma client
// Import main prisma instance which has encryption middleware
// This ensures consistent behavior and proper encryption across the app
export default prisma;
