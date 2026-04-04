import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { aiProviderManager } from '@/lib/ai/provider-manager';
import { sendOperationalAlert } from '@/lib/monitoring/alerts';
import { logAuditEvent } from '@/lib/monitoring/audit';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function isAdminRole(role?: string | null): boolean {
  return !!role && ['ADMIN', 'SUPER_ADMIN'].includes(role);
}

async function requireAdminSession() {
  const session = await auth();
  if (!session?.user?.id) {
    await sendOperationalAlert({
      category: 'security',
      severity: 'warning',
      event: 'admin_api_denied',
      message: 'Anonymous request denied for admin AI models API.',
      metadata: {
        route: '/api/ai/models',
      },
    });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isAdminRole(session.user.role)) {
    await sendOperationalAlert({
      category: 'security',
      severity: 'warning',
      event: 'admin_api_forbidden',
      message: 'Non-admin request denied for admin AI models API.',
      userId: session.user.id,
      metadata: {
        route: '/api/ai/models',
        role: session.user.role || 'unknown',
      },
    });
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return session;
}

/**
 * GET /api/ai/models
 * Get available AI providers and their models
 */
export async function GET(_request: NextRequest) {
  try {
    const session = await requireAdminSession();
    if (session instanceof NextResponse) {
      return session;
    }

    const status = await aiProviderManager.getStatus();
    logAuditEvent({
      action: 'admin_ai_models_read',
      outcome: 'success',
      actorId: session.user.id,
      actorRole: session.user.role,
      targetType: 'ai_provider_models',
      targetId: 'global',
      metadata: {
        route: '/api/ai/models',
        method: 'GET',
      },
    });
    
    const availableModels = {
      openai: [
        'gpt-4-turbo-preview',
        'gpt-4',
        'gpt-4o',
        'gpt-4o-mini',
        'gpt-3.5-turbo',
      ],
      gemini: [
        'gemini-flash-latest',
        'gemini-2.5-flash',
        'gemini-2.5-flash-lite',
        'gemini-2.5-pro',
      ],
      anthropic: [
        'claude-3-5-sonnet-20241022',
        'claude-3-opus-20240229',
        'claude-3-sonnet-20240229',
        'claude-3-haiku-20240307',
      ],
    };

    return NextResponse.json({
      providers: status,
      availableModels,
    });
  } catch (error) {
    console.error('[AI Models API] Error:', error);
    await sendOperationalAlert({
      category: 'ai',
      severity: 'warning',
      event: 'ai_models_route_failed',
      message: 'Admin AI models API GET request failed.',
      metadata: {
        route: '/api/ai/models',
        method: 'GET',
      },
      error: error instanceof Error ? error : new Error(String(error)),
    });
    return NextResponse.json(
      { error: 'Failed to fetch AI models' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ai/models
 * Update the default model for a provider
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdminSession();
    if (session instanceof NextResponse) {
      return session;
    }

    const body = await request.json();
    const { provider, model } = body;
    const allowedProviders = new Set(['openai', 'gemini', 'anthropic']);
    
    if (!provider || !model) {
      return NextResponse.json(
        { error: 'provider and model are required' },
        { status: 400 }
      );
    }

    if (!allowedProviders.has(provider)) {
      return NextResponse.json(
        { error: 'Unsupported provider' },
        { status: 400 }
      );
    }
    
    aiProviderManager.updateProviderModel(provider, model);
    logAuditEvent({
      action: 'admin_ai_models_update',
      outcome: 'success',
      actorId: session.user.id,
      actorRole: session.user.role,
      targetType: 'ai_provider_models',
      targetId: provider,
      metadata: {
        route: '/api/ai/models',
        method: 'POST',
        model,
      },
    });
    
    return NextResponse.json({ success: true, provider, model });
  } catch (error) {
    console.error('[AI Models API] Error:', error);
    await sendOperationalAlert({
      category: 'ai',
      severity: 'warning',
      event: 'ai_models_route_failed',
      message: 'Admin AI models API POST request failed.',
      metadata: {
        route: '/api/ai/models',
        method: 'POST',
      },
      error: error instanceof Error ? error : new Error(String(error)),
    });
    return NextResponse.json(
      { error: 'Failed to update model' },
      { status: 500 }
    );
  }
}
