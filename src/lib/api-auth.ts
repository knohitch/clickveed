import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { sendOperationalAlert } from '@/lib/monitoring/alerts';
import { logAuditEvent } from '@/lib/monitoring/audit';

export async function requireSuperAdminApi(context?: {
  route?: string;
  method?: string;
}): Promise<NextResponse | null> {
  const session = await auth();
  const route = context?.route || 'unknown';
  const method = context?.method || 'unknown';

  if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
    logAuditEvent({
      action: 'super_admin_api_access',
      outcome: 'denied',
      actorId: session?.user?.id,
      actorRole: session?.user?.role,
      targetType: 'api_route',
      targetId: route,
      metadata: {
        method,
      },
    });
    await sendOperationalAlert({
      category: 'security',
      severity: 'warning',
      event: 'super_admin_api_denied',
      message: 'Unauthorized attempt to access a super admin API route.',
      userId: session?.user?.id,
      metadata: {
        role: session?.user?.role || 'anonymous',
        route,
        method,
      },
    });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  logAuditEvent({
    action: 'super_admin_api_access',
    outcome: 'success',
    actorId: session.user.id,
    actorRole: session.user.role,
    targetType: 'api_route',
    targetId: route,
    metadata: {
      method,
    },
  });

  return null;
}

export async function requireProductionRouteFlag(context: {
  route: string;
  method: string;
  envFlag: string;
  description: string;
}): Promise<NextResponse | null> {
  if (process.env.NODE_ENV !== 'production' || process.env[context.envFlag] === 'true') {
    return null;
  }

  logAuditEvent({
    action: 'production_debug_route_blocked',
    outcome: 'denied',
    targetType: 'api_route',
    targetId: context.route,
    metadata: {
      method: context.method,
      envFlag: context.envFlag,
    },
  });

  await sendOperationalAlert({
    category: 'security',
    severity: 'warning',
    event: 'production_debug_route_blocked',
    message: `${context.description} was blocked in production because ${context.envFlag} is not enabled.`,
    metadata: {
      route: context.route,
      method: context.method,
      envFlag: context.envFlag,
    },
  });

  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
