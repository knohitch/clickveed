import * as Sentry from "@sentry/nextjs";

const { SENTRY_DSN, SENTRY_ENVIRONMENT, SENTRY_RELEASE } = process.env;

Sentry.init({
  dsn: SENTRY_DSN,
  environment: SENTRY_ENVIRONMENT || process.env.NODE_ENV || "development",
  release: SENTRY_RELEASE,
  integrations: [new Sentry.BrowserTracing()],
  tracesSampleRate: 1.0,
  beforeSend(event) {
    // Check if it is an exception, and then add some user data
    if (event.exception) {
      // Add custom properties to the error event
      event.extra = { ...event.extra, "custom.property": "value" };
    }
    return event;
  },
});

export default Sentry;