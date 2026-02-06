// Simple logger for server-side logging
// Replace console.log/console.error with proper logging service like Winston or Sentry in production

export const logger = {
  info: (message: string, data?: unknown) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[INFO] ${message}`, data ?? '');
    }
  },
  error: (message: string, error?: unknown) => {
    if (process.env.NODE_ENV === 'development') {
      console.error(`[ERROR] ${message}`, error ?? '');
    }
    // In production, send to error tracking service (e.g., Sentry)
    if (process.env.NODE_ENV === 'production' && error instanceof Error) {
      // TODO: Send to Sentry or other error tracking service
    }
  },
  warn: (message: string, data?: unknown) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[WARN] ${message}`, data ?? '');
    }
  }
};
