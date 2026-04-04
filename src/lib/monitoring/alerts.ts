import { logger } from '@/lib/monitoring/logger';
import { captureServerError, captureServerMessage } from '@/lib/sentry.server.config';

export type OperationalAlertCategory = 'security' | 'ai' | 'queue' | 'storage' | 'startup' | 'system';
export type OperationalAlertSeverity = 'info' | 'warning' | 'critical';

interface OperationalAlertInput {
  category: OperationalAlertCategory;
  severity: OperationalAlertSeverity;
  event: string;
  message: string;
  userId?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
  error?: Error;
}

const ALERT_DEDUPE_WINDOW_MS = 5 * 60 * 1000;
const recentAlerts = new Map<string, number>();

function shouldSendAlert(key: string): boolean {
  const now = Date.now();
  const lastSent = recentAlerts.get(key);

  if (lastSent && now - lastSent < ALERT_DEDUPE_WINDOW_MS) {
    return false;
  }

  recentAlerts.set(key, now);

  for (const [existingKey, timestamp] of recentAlerts.entries()) {
    if (now - timestamp >= ALERT_DEDUPE_WINDOW_MS) {
      recentAlerts.delete(existingKey);
    }
  }

  return true;
}

async function postWebhookAlert(payload: Record<string, unknown>): Promise<void> {
  const webhookUrl = process.env.OPS_ALERT_WEBHOOK_URL;
  if (!webhookUrl) {
    return;
  }

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    logger.warn('Operational alert webhook delivery failed', {
      event: 'operational_alert_webhook_failed',
      metadata: {
        originalEvent: payload.event,
      },
      error: error instanceof Error ? error : new Error(String(error)),
    });
  }
}

export async function sendOperationalAlert(input: OperationalAlertInput): Promise<void> {
  const dedupeKey = `${input.category}:${input.severity}:${input.event}:${input.userId || 'anonymous'}`;
  if (!shouldSendAlert(dedupeKey)) {
    return;
  }

  const payload = {
    timestamp: new Date().toISOString(),
    ...input,
    metadata: input.metadata || {},
  };

  if (input.severity === 'critical') {
    logger.error(input.message, {
      event: input.event,
      userId: input.userId,
      requestId: input.requestId,
      error: input.error,
      metadata: {
        category: input.category,
        severity: input.severity,
        ...payload.metadata,
      },
    });
  } else if (input.severity === 'warning') {
    logger.warn(input.message, {
      event: input.event,
      userId: input.userId,
      requestId: input.requestId,
      error: input.error,
      metadata: {
        category: input.category,
        severity: input.severity,
        ...payload.metadata,
      },
    });
  } else {
    logger.info(input.message, {
      event: input.event,
      userId: input.userId,
      requestId: input.requestId,
      metadata: {
        category: input.category,
        severity: input.severity,
        ...payload.metadata,
      },
    });
  }

  if (input.error) {
    await captureServerError(input.error, {
      operationalAlert: payload,
    });
  } else {
    await captureServerMessage(input.message, {
      operationalAlert: payload,
    });
  }

  await postWebhookAlert(payload);
}
