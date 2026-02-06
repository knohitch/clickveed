import * as Sentry from "@sentry/nextjs";

// Initialize Sentry for server-side error tracking
export async function initSentry() {
  // Only initialize Sentry in production
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    console.warn('SENTRY_DSN not configured - Sentry will not be initialized');
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "development",
    release: process.env.SENTRY_RELEASE,
    tracesSampleRate: 0.1, // Reduce sampling rate for performance
    // Only send errors in production
    enabled: process.env.NODE_ENV === 'production',
    beforeSend(event, hint) {
      // Add custom context to all events
      event.contexts = {
        ...event.contexts,
        server: {
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
        },
      };

      // Filter out certain types of errors that aren't actionable
      if (event.exception) {
        const exception = event.exception.values?.[0];
        if (exception) {
          // Don't send errors from certain common sources
          const ignoredErrors = [
            'TypeError: Cannot read property',
            'ReferenceError:',
            'SyntaxError:'
          ];
          
          if (ignoredErrors.some(msg => exception.value?.includes(msg))) {
            return null; // Drop the event
          }
        }
      }

      return event;
    },
  });

  console.log('✅ Sentry initialized for server-side error tracking');
}

// Capture an error with additional context
export async function captureServerError(error: Error, context?: Record<string, any>) {
  if (process.env.NODE_ENV === 'production') {
    Sentry.captureException(error, {
      contexts: {
        ...context,
        server: {
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
        },
      },
    });
  } else {
    console.error('Server Error (Sentry not enabled in dev):', error);
  }
}

// Capture a message with context
export async function captureServerMessage(message: string, context?: Record<string, any>) {
  if (process.env.NODE_ENV === 'production') {
    Sentry.captureMessage(message, {
      level: 'info',
      contexts: {
        ...context,
        server: {
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
        },
      },
    });
  } else {
    console.log('Server Message (Sentry not enabled in dev):', message);
  }
}
