import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { logError } from '@/lib/error-handler';
import { validateFile } from '@/lib/file-upload-security';

/**
 * Test authentication flow
 */
export async function testAuthFlow(request: NextRequest): Promise<{ 
  isAuthenticated: boolean; 
  userId?: string; 
  error?: string 
}> {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return {
        isAuthenticated: false,
        error: 'Not authenticated'
      };
    }
    
    return {
      isAuthenticated: true,
      userId: session.user.id
    };
  } catch (error) {
    logError(error as Error, 'Authentication test failed');
    return {
      isAuthenticated: false,
      error: (error as Error).message
    };
  }
}

/**
 * Test file upload security
 */
export function testFileUploadSecurity(file: File, fileType: 'image' | 'video' | 'audio' | 'document'): {
  isValid: boolean;
  error?: string;
} {
  try {
    return validateFile(file, fileType);
  } catch (error) {
    return {
      isValid: false,
      error: (error as Error).message
    };
  }
}

/**
 * Test database connectivity
 */
export async function testDatabaseConnection(): Promise<{ 
  connected: boolean; 
  error?: string 
}> {
  try {
    // This will test database connectivity by running a simple query
    const prisma = await import('@/server/prisma');
    await prisma.default.$queryRaw`SELECT 1`;
    
    return {
      connected: true
    };
  } catch (error) {
    return {
      connected: false,
      error: (error as Error).message
    };
  }
}

/**
 * Test Redis connection (if configured)
 */
export async function testRedisConnection(): Promise<{ 
  connected: boolean; 
  error?: string 
}> {
  try {
    if (!process.env.REDIS_URL) {
      return {
        connected: false,
        error: 'REDIS_URL not configured'
      };
    }
    
    // Try to create a Redis client to test connection
    const IORedis = await import('ioredis');
    const redis = new IORedis.default(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
      lazyConnect: true,
    });
    
    // Test connection
    await redis.ping();
    await redis.quit();
    
    return {
      connected: true
    };
  } catch (error) {
    return {
      connected: false,
      error: (error as Error).message
    };
  }
}

/**
 * Test API endpoint accessibility
 */
export async function testApiEndpoint(url: string): Promise<{ 
  accessible: boolean; 
  status?: number; 
  error?: string 
}> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    return {
      accessible: response.ok,
      status: response.status
    };
  } catch (error) {
    return {
      accessible: false,
      error: (error as Error).message
    };
  }
}
