import { logger } from '@/lib/monitoring/logger';

export type AuditOutcome = 'success' | 'denied' | 'failure';

interface AuditEventInput {
  action: string;
  outcome: AuditOutcome;
  actorId?: string;
  actorRole?: string | null;
  targetType: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}

export function logAuditEvent(input: AuditEventInput): void {
  const message = `Audit: ${input.action} (${input.outcome})`;
  const logMethod = input.outcome === 'success' ? logger.info.bind(logger) : logger.warn.bind(logger);

  logMethod(message, {
    userId: input.actorId,
    action: input.action,
    event: 'audit_event',
    metadata: {
      outcome: input.outcome,
      actorRole: input.actorRole || 'unknown',
      targetType: input.targetType,
      targetId: input.targetId || null,
      ...input.metadata,
    },
  });
}
