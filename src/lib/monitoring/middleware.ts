import { NextRequest, NextResponse } from 'next/server';
import { logger } from './logger';

// Generate a unique request ID
function generateRequestId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Extract client IP from request
function getClientIP(request: NextRequest): string {
  return request.headers.get('x-forwarded-for') || 
         request.headers.get('x-real-ip') || 
         request.ip || 
         'unknown';
}

// Extract user agent from request
function getUserAgent(request: NextRequest): string {
  return request.headers.get('user-agent') || 'unknown';
}

// Main monitoring middleware
export function withMonitoring(request: NextRequest): {
  requestId: string;
  startTime: number;
  context: any;
} {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  const context = {
    requestId,
    ip: getClientIP(request),
    userAgent: getUserAgent(request),
    method: request.method,
    url: request.url,
    timestamp: new Date().toISOString()
  };

  // Log the incoming request
  logger.logApiRequest(request.method, request.url, context);

  return { requestId, startTime, context };
}

// Log response completion
export function logResponse(
  request: NextRequest,
  response: NextResponse,
  startTime: number,
  context: any
): void {
  const duration = Date.now() - startTime;
  
  logger.logApiResponse(
    request.method,
    request.url,
    response.status,
    duration,
    {
      ...context,
      statusCode: response.status,
      duration,
      responseSize: response.headers.get('content-length') || 'unknown'
    }
  );
}

// Error logging middleware
export function logError(
  error: Error,
  request: NextRequest,
  context: any
): void {
  logger.error('Request failed', {
    ...context,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    }
  });
}

// Performance monitoring for specific operations
export function monitorPerformance<T>(
  operation: string,
  fn: () => Promise<T> | T,
  context?: any
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    const startTime = Date.now();
    
    try {
      const result = await fn();
      const duration = Date.now() - startTime;
      
      logger.logPerformance(operation, duration, {
        ...context,
        success: true
      });
      
      resolve(result);
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.logPerformance(operation, duration, {
        ...context,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      reject(error);
    }
  });
}

// Security event monitoring
export function logSecurityEvent(
  event: string,
  request: NextRequest,
  context?: any
): void {
  logger.logSecurityEvent(event, {
    ...context,
    ip: getClientIP(request),
    userAgent: getUserAgent(request),
    url: request.url,
    method: request.method
  });
}

// User activity monitoring
export function logUserActivity(
  action: string,
  userId: string,
  request: NextRequest,
  context?: any
): void {
  logger.logUserAction(action, userId, {
    ...context,
    ip: getClientIP(request),
    userAgent: getUserAgent(request),
    url: request.url,
    method: request.method
  });
}

// Business event monitoring
export function logBusinessEvent(
  event: string,
  userId: string,
  data?: any,
  context?: any
): void {
  logger.logBusinessEvent(event, userId, {
    ...context,
    event,
    businessData: data
  });
}
