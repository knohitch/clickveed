/**
 * Database utility functions for optimizing performance and handling timeouts
 */

import { PrismaClient } from '@prisma/client';

/**
 * Wraps a Prisma query with timeout and retry logic
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 10000,
  operation: string = 'Database operation'
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`${operation} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } catch (error) {
    console.error(`${operation} failed:`, error);
    throw error;
  }
}

/**
 * Retry a database operation with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  operationName: string = 'Database operation'
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      console.warn(`${operationName} attempt ${attempt} failed:`, error);

      if (attempt === maxRetries) {
        break;
      }

      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error(`${operationName} failed after ${maxRetries} attempts. Last error: ${lastError?.message || 'Unknown error'}`);
}

/**
 * Check database connection health
 */
export async function checkDatabaseHealth(prisma: PrismaClient): Promise<boolean> {
  try {
    await withTimeout(
      prisma.$queryRaw`SELECT 1`,
      5000,
      'Database health check'
    );
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

/**
 * Optimized user lookup for authentication
 */
export async function findUserForAuth(
  prisma: PrismaClient,
  email: string
): Promise<{
  id: string;
  email: string | null;
  displayName: string | null;
  passwordHash: string | null;
  role: string;
  onboardingComplete: boolean | null;
  status: string | null;
} | null> {
  return withTimeout(
    withRetry(
      () => prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          displayName: true,
          passwordHash: true,
          role: true,
          onboardingComplete: true,
          status: true
        }
      }),
      1, // Reduce retries for auth operations
      300, // Shorter delay for auth
      'User authentication lookup'
    ),
    3000, // 3 second timeout for auth
    'User authentication lookup'
  );
}
