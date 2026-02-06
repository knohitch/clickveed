/**
 * Log an error with context
 */
export function logError(error: Error, context: string = ''): void {
  const timestamp = new Date().toISOString();
  const errorInfo = {
    timestamp,
    context,
    message: error.message,
    stack: error.stack,
    name: error.name
  };

  // In production, send to logging service
  // For now, we'll log to console
  console.error('[ERROR]', JSON.stringify(errorInfo));
}

/**
 * Format error response for API endpoints
 */
export function formatErrorResponse(error: Error, statusCode: number = 500): any {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const response = {
    error: {
      message: isDevelopment ? error.message : 'An internal error occurred',
      code: error.name,
      statusCode
    }
  };

  // In development, include stack trace
  if (isDevelopment && error.stack) {
    (response.error as any).stack = error.stack;
  }

  return response;
}

/**
 * Handle API errors consistently
 */
export function handleApiError(error: Error, statusCode: number = 500): Response {
  logError(error, `API Error (${statusCode})`);
  
  const response = formatErrorResponse(error, statusCode);
  
  return new Response(JSON.stringify(response), {
    status: statusCode,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}
