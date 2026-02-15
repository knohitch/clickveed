import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { aiProviderManager } from '@/lib/ai/provider-manager';

/**
 * GET /api/ai/models
 * Get available AI providers and their models
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const status = await aiProviderManager.getStatus();
    
    const availableModels = {
      openai: [
        'gpt-4-turbo-preview',
        'gpt-4',
        'gpt-4o',
        'gpt-4o-mini',
        'gpt-3.5-turbo',
      ],
      gemini: [
        'gemini-2.0-flash-exp',
        'gemini-1.5-pro',
        'gemini-1.5-flash',
        'gemini-1.0-pro',
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
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin (optional - you may want to restrict this)
    // const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    // if (user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN') {
    //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    // }

    const body = await request.json();
    const { provider, model } = body;
    
    if (!provider || !model) {
      return NextResponse.json(
        { error: 'provider and model are required' },
        { status: 400 }
      );
    }
    
    aiProviderManager.updateProviderModel(provider, model);
    
    return NextResponse.json({ success: true, provider, model });
  } catch (error) {
    console.error('[AI Models API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update model' },
      { status: 500 }
    );
  }
}
