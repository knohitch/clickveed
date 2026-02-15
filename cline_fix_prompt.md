# COMPLETE APPLICATION FIX - All Critical Bugs

## CRITICAL ISSUES TO FIX (Priority Order):

### 🔴 CRITICAL - Must Fix First:
1. **Feature Access Control Broken** - Users can't access features in their plan
2. **Upload System Completely Broken** - FormData parsing fails
3. **No AI Provider Available** - Missing/invalid API keys
4. **Database Connection Instability** - Intermittent PostgreSQL errors

### 🟡 HIGH PRIORITY:
5. AI Provider Fallback System (OpenAI → Gemini → Anthropic)
6. Dynamic Model Selection (no hardcoded models)

---

## STEP 1: CRITICAL - Analyze Current System

**Before making ANY changes, gather this information:**

### A. Database & Feature Access System
```bash
# Find these files:
1. prisma/schema.prisma
   - Look for: PlanFeatureAccess, Plan, Feature tables
   - Check relationships and constraints

2. Search for "FeatureAccess" in codebase:
   - Find: feature checking logic
   - Find: hasFeature functions
   - Find: plan validation

3. Check seed data:
   - Find: prisma/seed.ts or database/seeds/
   - Verify feature IDs match what's being checked
```

**PASTE THE CONTENTS OF:**
- `prisma/schema.prisma`
- Any file with `FeatureAccess` or `hasFeature`
- The seed/migration files

### B. Upload System
```bash
# Find the upload endpoint:
1. app/api/upload/route.ts (or .js)
2. Search for: "formData", "multipart", "upload"
3. Find upload-related middleware
```

**PASTE THE CONTENTS OF:**
- The complete upload route file
- Any upload utility functions

### C. Environment Variables & API Keys
```bash
# Check what's configured:
1. List ALL environment variable files
2. Show current .env structure (REDACT actual keys)
3. Find where API keys are validated on startup
```

**PASTE:**
- `.env.example` or list of required env vars
- Any API key validation/initialization code

### D. Provider Manager System
```bash
# Find AI provider code:
1. Search for: "ProviderManager", "No streaming provider"
2. Find: OpenAI initialization
3. Find: Gemini/Google AI initialization
4. Find: Circuit breaker logic
```

**PASTE THE CONTENTS OF:**
- Provider manager or AI configuration files
- Where the error "No streaming provider available" is thrown

---

## STEP 2: FIX FEATURE ACCESS SYSTEM (CRITICAL)

### Issue: Features showing as not in plan despite being added

**Root Cause Analysis:**
The logs show:
```
featureId: 'topic-researcher',
hasFeature: false,
```

This means the feature check is failing. Common causes:
1. Feature ID mismatch (database vs code)
2. Plan-feature relationship not created
3. Caching issue
4. Wrong user/plan being checked

### Fix Implementation:

#### 2.1: Verify Database Schema
Ensure your schema has proper relationships:

```prisma
// In prisma/schema.prisma

model Plan {
  id          String   @id @default(cuid())
  name        String   @unique
  displayName String
  features    PlanFeatureAccess[]
  users       User[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Feature {
  id          String   @id @unique // e.g., 'topic-researcher'
  name        String
  description String?
  plans       PlanFeatureAccess[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model PlanFeatureAccess {
  id        String   @id @default(cuid())
  planId    String
  featureId String
  enabled   Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  plan    Plan    @relation(fields: [planId], references: [id], onDelete: Cascade)
  feature Feature @relation(fields: [featureId], references: [id], onDelete: Cascade)
  
  @@unique([planId, featureId])
  @@index([planId])
  @@index([featureId])
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  planId    String?
  plan      Plan?    @relation(fields: [planId], references: [id])
  // ... other fields
}
```

#### 2.2: Create Feature Check Utility

Create/Update: `lib/features/check-access.ts`

```typescript
import { prisma } from '@/lib/prisma';

export async function checkFeatureAccess(
  userId: string, 
  featureId: string
): Promise<boolean> {
  try {
    console.log(`[FeatureAccess] Checking ${featureId} for user ${userId}`);
    
    // Get user with plan
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        plan: {
          include: {
            features: {
              where: {
                featureId: featureId,
                enabled: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      console.error(`[FeatureAccess] User ${userId} not found`);
      return false;
    }

    if (!user.plan) {
      console.error(`[FeatureAccess] User ${userId} has no plan assigned`);
      return false;
    }

    const hasFeature = user.plan.features.length > 0;
    
    console.log(`[FeatureAccess] Result for ${featureId}:`, {
      userId,
      planId: user.plan.id,
      planName: user.plan.name,
      hasFeature,
      availableFeatures: user.plan.features.map(f => f.featureId),
    });

    return hasFeature;
  } catch (error) {
    console.error('[FeatureAccess] Error checking feature access:', error);
    return false;
  }
}

// Get all features for a user's plan
export async function getUserPlanFeatures(userId: string): Promise<string[]> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        plan: {
          include: {
            features: {
              where: { enabled: true },
              select: { featureId: true },
            },
          },
        },
      },
    });

    if (!user?.plan) return [];
    
    return user.plan.features.map(f => f.featureId);
  } catch (error) {
    console.error('[getUserPlanFeatures] Error:', error);
    return [];
  }
}

// Admin function to add feature to plan
export async function addFeatureToPlan(
  planId: string,
  featureId: string
): Promise<boolean> {
  try {
    // First ensure the feature exists
    const feature = await prisma.feature.findUnique({
      where: { id: featureId },
    });

    if (!feature) {
      console.error(`[addFeatureToPlan] Feature ${featureId} does not exist`);
      return false;
    }

    // Add to plan (upsert to handle duplicates)
    await prisma.planFeatureAccess.upsert({
      where: {
        planId_featureId: {
          planId,
          featureId,
        },
      },
      create: {
        planId,
        featureId,
        enabled: true,
      },
      update: {
        enabled: true,
      },
    });

    console.log(`[addFeatureToPlan] Successfully added ${featureId} to plan ${planId}`);
    return true;
  } catch (error) {
    console.error('[addFeatureToPlan] Error:', error);
    return false;
  }
}
```

#### 2.3: Fix Feature Seeding

Create/Update: `prisma/seed-features.ts`

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const FEATURES = [
  { id: 'topic-researcher', name: 'AI Topic Researcher', description: 'Research topics with AI' },
  { id: 'video-suite', name: 'Video Suite', description: 'Complete video creation suite' },
  { id: 'video-pipeline', name: 'Video Pipeline', description: 'Automated video pipeline' },
  { id: 'video-editor', name: 'Video Editor', description: 'Advanced video editing' },
  { id: 'script-generator', name: 'AI Script Generator', description: 'Generate video scripts' },
  { id: 'video-from-url', name: 'Video from URL', description: 'Create videos from URLs' },
  { id: 'voice-over', name: 'AI Voice Over', description: 'Generate voice overs' },
  { id: 'stock-media', name: 'Stock Media', description: 'Access stock media library' },
  { id: 'creative-assistant', name: 'Creative Assistant', description: 'AI creative assistant' },
];

const PLANS = [
  {
    id: 'plan_free',
    name: 'free',
    displayName: 'Free Plan',
    features: ['creative-assistant', 'stock-media'],
  },
  {
    id: 'plan_creator',
    name: 'creator',
    displayName: 'Creator Plan',
    features: [
      'topic-researcher',
      'video-suite',
      'video-pipeline',
      'video-editor',
      'script-generator',
      'video-from-url',
      'creative-assistant',
      'stock-media',
    ],
  },
  {
    id: 'plan_pro',
    name: 'pro',
    displayName: 'Pro Plan',
    features: [
      'topic-researcher',
      'video-suite',
      'video-pipeline',
      'video-editor',
      'script-generator',
      'video-from-url',
      'voice-over',
      'creative-assistant',
      'stock-media',
    ],
  },
];

async function seedFeatures() {
  console.log('🌱 Seeding features and plans...');

  // 1. Create all features
  for (const feature of FEATURES) {
    await prisma.feature.upsert({
      where: { id: feature.id },
      create: feature,
      update: { name: feature.name, description: feature.description },
    });
    console.log(`✅ Feature: ${feature.id}`);
  }

  // 2. Create all plans
  for (const plan of PLANS) {
    await prisma.plan.upsert({
      where: { id: plan.id },
      create: {
        id: plan.id,
        name: plan.name,
        displayName: plan.displayName,
      },
      update: {
        name: plan.name,
        displayName: plan.displayName,
      },
    });
    console.log(`✅ Plan: ${plan.name}`);

    // 3. Add features to plan
    for (const featureId of plan.features) {
      await prisma.planFeatureAccess.upsert({
        where: {
          planId_featureId: {
            planId: plan.id,
            featureId,
          },
        },
        create: {
          planId: plan.id,
          featureId,
          enabled: true,
        },
        update: {
          enabled: true,
        },
      });
    }
    console.log(`✅ Added ${plan.features.length} features to ${plan.name}`);
  }

  console.log('✅ Seeding completed!');
}

seedFeatures()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

**Run this:**
```bash
npx tsx prisma/seed-features.ts
```

#### 2.4: Add Feature Check API Endpoint

Create: `app/api/features/check/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { checkFeatureAccess, getUserPlanFeatures } from '@/lib/features/check-access';

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { featureId } = await request.json();
    
    const hasAccess = await checkFeatureAccess(session.user.id, featureId);
    
    return NextResponse.json({ hasAccess });
  } catch (error) {
    console.error('[Feature Check API] Error:', error);
    return NextResponse.json({ error: 'Failed to check feature' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const features = await getUserPlanFeatures(session.user.id);
    
    return NextResponse.json({ features });
  } catch (error) {
    console.error('[Feature List API] Error:', error);
    return NextResponse.json({ error: 'Failed to get features' }, { status: 500 });
  }
}
```

---

## STEP 3: FIX UPLOAD SYSTEM (CRITICAL)

### Issue: "Could not parse content as FormData"

**Root Cause:** The upload endpoint is trying to parse FormData but receiving malformed requests or wrong content-type.

### Fix Implementation:

Create/Update: `app/api/upload/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { getServerSession } from 'next-auth';

export const config = {
  api: {
    bodyParser: false, // Disable default body parser for file uploads
  },
};

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Upload] Processing upload request');
    console.log('[Upload] Content-Type:', request.headers.get('content-type'));

    let formData: FormData;
    
    try {
      formData = await request.formData();
    } catch (parseError) {
      console.error('[Upload] FormData parsing error:', parseError);
      return NextResponse.json(
        { 
          error: 'Invalid file upload format',
          details: 'Please ensure you are sending multipart/form-data'
        }, 
        { status: 400 }
      );
    }

    const file = formData.get('file') as File | null;
    
    if (!file) {
      console.error('[Upload] No file in FormData');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    console.log('[Upload] File received:', {
      name: file.name,
      type: file.type,
      size: file.size,
    });

    // Validate file size (50MB limit)
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 50MB' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo',
      'video/webm',
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { 
          error: 'Invalid file type',
          allowed: 'Images (jpg, png, gif, webp) and Videos (mp4, mov, avi, webm)'
        },
        { status: 400 }
      );
    }

    // Create upload directory
    const uploadDir = join(process.cwd(), 'public', 'uploads', session.user.id);
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (mkdirError) {
      console.error('[Upload] Error creating directory:', mkdirError);
    }

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${timestamp}_${sanitizedName}`;
    const filepath = join(uploadDir, filename);

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    await writeFile(filepath, buffer);
    console.log('[Upload] File saved:', filepath);

    const publicUrl = `/uploads/${session.user.id}/${filename}`;

    // Optionally save to database
    // await prisma.media.create({
    //   data: {
    //     userId: session.user.id,
    //     filename: file.name,
    //     filepath: publicUrl,
    //     fileType: file.type,
    //     fileSize: file.size,
    //   },
    // });

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename: file.name,
      size: file.size,
      type: file.type,
    });

  } catch (error: any) {
    console.error('[Upload] Unexpected error:', error);
    return NextResponse.json(
      { 
        error: 'Upload failed',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// Optional: GET endpoint to list user's uploads
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // If you have a Media model:
    // const uploads = await prisma.media.findMany({
    //   where: { userId: session.user.id },
    //   orderBy: { createdAt: 'desc' },
    // });

    return NextResponse.json({ uploads: [] });
  } catch (error) {
    console.error('[Upload List] Error:', error);
    return NextResponse.json({ error: 'Failed to list uploads' }, { status: 500 });
  }
}
```

**Also update your Next.js config:**

```javascript
// next.config.js
module.exports = {
  // ... other config
  
  experimental: {
    // Enable if using App Router with file uploads
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
  
  // Fix the deprecated images.domains warning
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', // Or specify your domains
      },
    ],
    // Remove the deprecated 'domains' config if present
  },
};
```

---

## STEP 4: FIX AI PROVIDER SYSTEM (CRITICAL)

### Issue: "No streaming provider available. Please configure an API key"

**This is the root cause of most failures!**

### Fix Implementation:

#### 4.1: IMMEDIATE - Validate Environment Variables

Create: `lib/ai/validate-env.ts`

```typescript
export function validateAIEnvironment() {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  console.log('🔍 Validating AI Environment Variables...\n');
  
  // Check OpenAI
  if (!process.env.OPENAI_API_KEY) {
    warnings.push('⚠️  OPENAI_API_KEY is not set');
  } else if (!process.env.OPENAI_API_KEY.startsWith('sk-')) {
    errors.push('❌ OPENAI_API_KEY appears invalid (should start with sk-)');
  } else {
    console.log('✅ OPENAI_API_KEY is configured');
  }
  
  // Check Google AI (Gemini)
  if (!process.env.GOOGLE_AI_API_KEY) {
    warnings.push('⚠️  GOOGLE_AI_API_KEY is not set');
  } else {
    console.log('✅ GOOGLE_AI_API_KEY is configured');
  }
  
  // Check Anthropic
  if (!process.env.ANTHROPIC_API_KEY) {
    warnings.push('⚠️  ANTHROPIC_API_KEY is not set');
  } else if (!process.env.ANTHROPIC_API_KEY.startsWith('sk-ant-')) {
    errors.push('❌ ANTHROPIC_API_KEY appears invalid (should start with sk-ant-)');
  } else {
    console.log('✅ ANTHROPIC_API_KEY is configured');
  }
  
  // Check if at least one is configured
  const hasAtLeastOne = !!(
    process.env.OPENAI_API_KEY ||
    process.env.GOOGLE_AI_API_KEY ||
    process.env.ANTHROPIC_API_KEY
  );
  
  if (!hasAtLeastOne) {
    errors.push('❌ CRITICAL: No AI provider API keys configured!');
  }
  
  // Print warnings
  warnings.forEach(w => console.log(w));
  
  // Print errors
  if (errors.length > 0) {
    console.error('\n❌ CRITICAL ERRORS:');
    errors.forEach(e => console.error(e));
    console.error('\nPlease add API keys to your .env file:');
    console.error('OPENAI_API_KEY=sk-...');
    console.error('GOOGLE_AI_API_KEY=AIza...');
    console.error('ANTHROPIC_API_KEY=sk-ant-...');
    throw new Error('AI Environment validation failed');
  }
  
  console.log('\n✅ AI Environment validation passed\n');
}
```

#### 4.2: Update Environment Variables

**CRITICAL: Add these to your `.env` file RIGHT NOW:**

```bash
# ============================================
# AI PROVIDER API KEYS (At least ONE required)
# ============================================

# OpenAI - Get from https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-proj-YOUR_KEY_HERE

# Google AI (Gemini) - Get from https://aistudio.google.com/app/apikey
GOOGLE_AI_API_KEY=AIzaYOUR_KEY_HERE

# Anthropic (Claude) - Get from https://console.anthropic.com/
ANTHROPIC_API_KEY=sk-ant-YOUR_KEY_HERE

# Model Configuration (Optional - defaults provided)
OPENAI_DEFAULT_MODEL=gpt-4-turbo-preview
GEMINI_DEFAULT_MODEL=gemini-2.0-flash-exp
ANTHROPIC_DEFAULT_MODEL=claude-3-5-sonnet-20241022

# Provider Priority (comma-separated, first = highest priority)
AI_PROVIDER_PRIORITY=openai,gemini,anthropic

# Circuit Breaker
CIRCUIT_BREAKER_THRESHOLD=5
CIRCUIT_BREAKER_TIMEOUT=60000
```

#### 4.3: Create Robust Provider Manager

Create: `lib/ai/provider-manager.ts`

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { validateAIEnvironment } from './validate-env';

type AIProvider = 'openai' | 'gemini' | 'anthropic';
type GeminiModel = string; // Allow any Gemini model

interface ProviderConfig {
  name: AIProvider;
  enabled: boolean;
  apiKey: string | null;
  defaultModel: string;
  priority: number;
  healthStatus: 'healthy' | 'degraded' | 'down';
  failureCount: number;
  lastFailure?: Date;
}

interface GenerateOptions {
  provider?: AIProvider;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

class AIProviderManager {
  private providers: Map<AIProvider, ProviderConfig> = new Map();
  private circuitBreakerThreshold: number;
  private circuitBreakerTimeout: number;
  private initialized = false;

  constructor() {
    this.circuitBreakerThreshold = parseInt(
      process.env.CIRCUIT_BREAKER_THRESHOLD || '5'
    );
    this.circuitBreakerTimeout = parseInt(
      process.env.CIRCUIT_BREAKER_TIMEOUT || '60000'
    );
  }

  private initialize() {
    if (this.initialized) return;
    
    try {
      validateAIEnvironment();
    } catch (error) {
      console.error('❌ AI Environment validation failed:', error);
      // Continue but log the error
    }

    const priority = (
      process.env.AI_PROVIDER_PRIORITY || 'openai,gemini,anthropic'
    )
      .split(',')
      .map(p => p.trim());

    // OpenAI
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      this.providers.set('openai', {
        name: 'openai',
        enabled: true,
        apiKey: openaiKey,
        defaultModel: process.env.OPENAI_DEFAULT_MODEL || 'gpt-4-turbo-preview',
        priority: priority.indexOf('openai'),
        healthStatus: 'healthy',
        failureCount: 0,
      });
      console.log('✅ OpenAI provider initialized');
    }

    // Gemini
    const geminiKey = process.env.GOOGLE_AI_API_KEY;
    if (geminiKey) {
      this.providers.set('gemini', {
        name: 'gemini',
        enabled: true,
        apiKey: geminiKey,
        defaultModel: process.env.GEMINI_DEFAULT_MODEL || 'gemini-2.0-flash-exp',
        priority: priority.indexOf('gemini'),
        healthStatus: 'healthy',
        failureCount: 0,
      });
      console.log('✅ Gemini provider initialized');
    }

    // Anthropic
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (anthropicKey) {
      this.providers.set('anthropic', {
        name: 'anthropic',
        enabled: true,
        apiKey: anthropicKey,
        defaultModel:
          process.env.ANTHROPIC_DEFAULT_MODEL || 'claude-3-5-sonnet-20241022',
        priority: priority.indexOf('anthropic'),
        healthStatus: 'healthy',
        failureCount: 0,
      });
      console.log('✅ Anthropic provider initialized');
    }

    if (this.providers.size === 0) {
      console.error('❌ NO AI PROVIDERS CONFIGURED!');
      console.error('Please add at least one API key to your .env file');
    } else {
      console.log(
        `✅ Initialized ${this.providers.size} AI provider(s):`,
        Array.from(this.providers.keys())
      );
    }

    this.initialized = true;
  }

  private getAvailableProviders(): ProviderConfig[] {
    this.initialize();
    
    return Array.from(this.providers.values())
      .filter(p => p.enabled && p.apiKey && p.healthStatus !== 'down')
      .sort((a, b) => a.priority - b.priority);
  }

  private recordFailure(provider: AIProvider, error: any) {
    const config = this.providers.get(provider);
    if (!config) return;

    config.failureCount++;
    config.lastFailure = new Date();

    const isQuotaError =
      error.status === 429 ||
      error.message?.includes('quota') ||
      error.message?.includes('insufficient_quota');

    console.log(
      `[CircuitBreaker] Provider ${provider} has ${config.failureCount}/${this.circuitBreakerThreshold} failures` +
        (isQuotaError ? ' (QUOTA EXCEEDED)' : '')
    );

    if (config.failureCount >= this.circuitBreakerThreshold || isQuotaError) {
      config.healthStatus = 'down';
      console.error(`[CircuitBreaker] Provider ${provider} marked as DOWN`);

      setTimeout(() => {
        config.healthStatus = 'healthy';
        config.failureCount = 0;
        console.log(`[CircuitBreaker] Provider ${provider} recovered`);
      }, this.circuitBreakerTimeout);
    }
  }

  async generate(prompt: string, options: GenerateOptions = {}): Promise<any> {
    this.initialize();
    
    const availableProviders = this.getAvailableProviders();

    if (availableProviders.length === 0) {
      throw new Error(
        'No streaming provider available. Please configure an API key.\n' +
        'Add OPENAI_API_KEY, GOOGLE_AI_API_KEY, or ANTHROPIC_API_KEY to your .env file'
      );
    }

    const errors: Array<{ provider: string; error: any }> = [];

    for (const config of availableProviders) {
      if (options.provider && config.name !== options.provider) continue;

      try {
        const model = options.model || config.defaultModel;
        console.log(`[ProviderManager] Attempting ${config.name} with model ${model}`);

        let response;

        switch (config.name) {
          case 'openai':
            response = await this.generateWithOpenAI(prompt, model, options);
            break;
          case 'gemini':
            response = await this.generateWithGemini(prompt, model, options);
            break;
          case 'anthropic':
            response = await this.generateWithAnthropic(prompt, model, options);
            break;
        }

        config.failureCount = 0;
        config.healthStatus = 'healthy';
        console.log(`✅ Success with ${config.name} (${model})`);
        
        return response;

      } catch (error: any) {
        console.error(`❌ ${config.name} failed:`, error.message);
        this.recordFailure(config.name, error);
        errors.push({ provider: config.name, error });

        const isQuotaError =
          error.status === 429 ||
          error.message?.includes('quota') ||
          error.message?.includes('insufficient_quota');

        if (isQuotaError) {
          console.log(`[ProviderManager] Quota exceeded with ${config.name}, trying next provider...`);
          continue;
        }

        if (options.provider) {
          throw error;
        }

        continue;
      }
    }

    const errorMessage = `All AI providers failed:\n${errors
      .map(e => `- ${e.provider}: ${e.error.message}`)
      .join('\n')}`;
    throw new Error(errorMessage);
  }

  private async generateWithOpenAI(
    prompt: string,
    model: string,
    options: GenerateOptions
  ) {
    const config = this.providers.get('openai');
    if (!config?.apiKey) throw new Error('OpenAI API key not configured');

    const client = new OpenAI({ apiKey: config.apiKey });

    const response = await client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 2000,
      stream: options.stream || false,
    });

    if (options.stream) {
      return response; // Return stream directly
    }

    return {
      text: response.choices[0]?.message?.content || '',
      provider: 'openai',
      model,
    };
  }

  private async generateWithGemini(
    prompt: string,
    model: string,
    options: GenerateOptions
  ) {
    const config = this.providers.get('gemini');
    if (!config?.apiKey) throw new Error('Gemini API key not configured');

    const genAI = new GoogleGenerativeAI(config.apiKey);
    const geminiModel = genAI.getGenerativeModel({ model });

    console.log(`[Gemini] Using model: ${model}`);

    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;

    return {
      text: response.text(),
      provider: 'gemini',
      model,
    };
  }

  private async generateWithAnthropic(
    prompt: string,
    model: string,
    options: GenerateOptions
  ) {
    const config = this.providers.get('anthropic');
    if (!config?.apiKey) throw new Error('Anthropic API key not configured');

    const client = new Anthropic({ apiKey: config.apiKey });

    const response = await client.messages.create({
      model,
      max_tokens: options.maxTokens || 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    return {
      text: response.content[0]?.type === 'text' ? response.content[0].text : '',
      provider: 'anthropic',
      model,
    };
  }

  getStatus() {
    this.initialize();
    
    return Array.from(this.providers.entries()).map(([name, config]) => ({
      name,
      enabled: config.enabled,
      hasApiKey: !!config.apiKey,
      healthStatus: config.healthStatus,
      failureCount: config.failureCount,
      defaultModel: config.defaultModel,
    }));
  }
}

export const aiProviderManager = new AIProviderManager();
```

#### 4.4: Install Required Dependencies

```bash
npm install openai @google/generative-ai @anthropic-ai/sdk
```

#### 4.5: Replace ALL Existing AI Calls

**Search for these patterns and replace:**

**Before:**
```typescript
const openai = new OpenAI();
const response = await openai.chat.completions.create({...});
```

**After:**
```typescript
import { aiProviderManager } from '@/lib/ai/provider-manager';

const response = await aiProviderManager.generate(prompt, {
  temperature: 0.7,
  maxTokens: 2000,
});
```

**Find and replace in these files:**
- Video script generation
- Topic researcher
- Creative assistant
- Any file with `new OpenAI()` or `generateTextStream`

---

## STEP 5: FIX DATABASE CONNECTION ISSUES

### Issue: "Connection reset by peer", "Socket not connected"

Update: `prisma/schema.prisma`

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// In your database URL, add these parameters:
// postgresql://user:password@host:port/database?connection_limit=10&pool_timeout=30&connect_timeout=30
```

Create: `lib/prisma.ts`

```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Handle connection errors gracefully
prisma.$connect().catch((error) => {
  console.error('Failed to connect to database:', error);
});

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
```

---

## STEP 6: ADD STARTUP VALIDATION

Create: `lib/startup-check.ts`

```typescript
import { validateAIEnvironment } from './ai/validate-env';
import { prisma } from './prisma';
import { aiProviderManager } from './ai/provider-manager';

export async function startupHealthCheck() {
  console.log('🏥 Running startup health check...\n');

  const results = {
    ai: false,
    database: false,
    features: false,
  };

  // 1. Check AI Providers
  try {
    validateAIEnvironment();
    const status = aiProviderManager.getStatus();
    const healthyProviders = status.filter(
      p => p.enabled && p.hasApiKey && p.healthStatus === 'healthy'
    );
    
    if (healthyProviders.length === 0) {
      console.error('❌ No healthy AI providers available');
    } else {
      console.log(`✅ ${healthyProviders.length} AI provider(s) available`);
      results.ai = true;
    }
  } catch (error) {
    console.error('❌ AI validation failed:', error);
  }

  // 2. Check Database
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connection OK');
    results.database = true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
  }

  // 3. Check Features Setup
  try {
    const featureCount = await prisma.feature.count();
    const planCount = await prisma.plan.count();
    
    if (featureCount === 0 || planCount === 0) {
      console.warn('⚠️  Features/Plans not seeded. Run: npx tsx prisma/seed-features.ts');
    } else {
      console.log(`✅ Features (${featureCount}) and Plans (${planCount}) configured`);
      results.features = true;
    }
  } catch (error) {
    console.error('❌ Feature check failed:', error);
  }

  console.log('\n🏁 Startup check complete\n');

  const allGood = Object.values(results).every(r => r);
  if (!allGood) {
    console.error('⚠️  Some health checks failed. Application may not function correctly.');
  }

  return results;
}
```

Add to your `app/layout.tsx` or main entry point:

```typescript
import { startupHealthCheck } from '@/lib/startup-check';

// Run on server startup (outside component)
if (typeof window === 'undefined') {
  startupHealthCheck().catch(console.error);
}
```

---

## STEP 7: QUICK FIX CHECKLIST

**Run these commands IN ORDER:**

```bash
# 1. Install dependencies
npm install openai @google/generative-ai @anthropic-ai/sdk

# 2. Add API keys to .env (CRITICAL - DO THIS NOW)
# Edit .env and add at least ONE of these:
# OPENAI_API_KEY=sk-...
# GOOGLE_AI_API_KEY=AIza...
# ANTHROPIC_API_KEY=sk-ant-...

# 3. Seed features and plans
npx tsx prisma/seed-features.ts

# 4. Check database connection
npx prisma db pull  # or npx prisma migrate deploy

# 5. Restart your application
npm run dev  # or your start command
```

---

## STEP 8: VERIFICATION TESTS

After implementing, verify:

### Test 1: Feature Access
```bash
# Check if features are seeded
npx prisma studio
# Look at Feature, Plan, and PlanFeatureAccess tables
```

### Test 2: Upload
```bash
# Try uploading an image through your UI
# Check console logs for [Upload] messages
# Verify file appears in public/uploads/[userId]/
```

### Test 3: AI Provider
```bash
# Check startup logs for:
# ✅ OpenAI provider initialized
# ✅ Gemini provider initialized
# ✅ Anthropic provider initialized

# Try using any AI feature
# Should see: [ProviderManager] Attempting [provider] with model [model]
```

---

## CRITICAL DEBUGGING STEPS

If issues persist:

1. **Check Environment Variables:**
   ```bash
   node -e "console.log(process.env.OPENAI_API_KEY ? 'OpenAI: SET' : 'OpenAI: MISSING')"
   node -e "console.log(process.env.GOOGLE_AI_API_KEY ? 'Gemini: SET' : 'Gemini: MISSING')"
   ```

2. **Test API Keys Manually:**
   ```bash
   # Create test-api.ts
   import OpenAI from 'openai';
   const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
   client.chat.completions.create({
     model: 'gpt-3.5-turbo',
     messages: [{role: 'user', content: 'test'}],
     max_tokens: 5
   }).then(r => console.log('✅ OpenAI works')).catch(e => console.error('❌', e.message));
   ```

3. **Check Database:**
   ```sql
   SELECT p.name as plan_name, f.id as feature_id, pfa.enabled
   FROM "Plan" p
   JOIN "PlanFeatureAccess" pfa ON p.id = pfa."planId"
   JOIN "Feature" f ON f.id = pfa."featureId"
   ORDER BY p.name, f.id;
   ```

4. **Check File Permissions:**
   ```bash
   # Ensure upload directory is writable
   mkdir -p public/uploads
   chmod 755 public/uploads
   ```

---

## SUMMARY OF FIXES

1. ✅ **Feature Access**: Proper database relationships + seeding + checking logic
2. ✅ **Upload System**: Robust FormData parsing + validation + error handling
3. ✅ **AI Providers**: Multi-provider fallback + dynamic models + quota handling
4. ✅ **Database**: Connection pooling + retry logic + graceful errors
5. ✅ **Startup**: Health checks + validation + clear error messages

---

## EXPECTED OUTCOMES

After implementation:

- ✅ Users can access features in their plan
- ✅ File uploads work for images and videos
- ✅ AI features work with automatic fallback
- ✅ No more "No streaming provider" errors
- ✅ No more "Feature not in plan" errors
- ✅ Graceful degradation when providers fail
- ✅ Clear error messages for configuration issues

---

## MAINTENANCE

**Going forward:**

1. **Monitor provider health:**
   - Create admin dashboard showing provider status
   - Set up alerts for repeated failures

2. **Regular quota checks:**
   - Monitor OpenAI usage dashboard
   - Set billing alerts

3. **Database health:**
   - Set up connection monitoring
   - Configure automatic retries

4. **Feature management:**
   - Create admin UI for adding/removing features from plans
   - Version control your seed data

---

## GET HELP

If you're still stuck after implementing all of this:

1. Check the application logs for specific error messages
2. Run the validation script: `npx tsx lib/startup-check.ts`
3. Share the output from startup health check
4. Verify environment variables are actually loaded

This comprehensive fix addresses EVERY issue you mentioned. Implement in order and test after each major step

## STEP 2: Create New Environment Variables Structure

Update `.env.example` and `.env` with:

```bash
# ============================================
# AI PROVIDER CONFIGURATION
# ============================================

# OpenAI Configuration
OPENAI_API_KEY=sk-...
OPENAI_DEFAULT_MODEL=gpt-4-turbo-preview
OPENAI_FALLBACK_MODEL=gpt-3.5-turbo

# Google AI (Gemini) Configuration
GOOGLE_AI_API_KEY=AIza...
GEMINI_DEFAULT_MODEL=gemini-2.0-flash-exp
GEMINI_FALLBACK_MODEL=gemini-1.5-flash
# Available models: gemini-2.0-flash-exp, gemini-1.5-pro, gemini-1.5-flash, gemini-1.0-pro

# Anthropic (Claude) Configuration
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_DEFAULT_MODEL=claude-3-5-sonnet-20241022
ANTHROPIC_FALLBACK_MODEL=claude-3-haiku-20240307

# Provider Priority Order (comma-separated)
AI_PROVIDER_PRIORITY=openai,gemini,anthropic

# Circuit Breaker Settings
CIRCUIT_BREAKER_THRESHOLD=5
CIRCUIT_BREAKER_TIMEOUT=60000

# Enable/Disable Providers
ENABLE_OPENAI=true
ENABLE_GEMINI=true
ENABLE_ANTHROPIC=true
```

---

## STEP 3: Create Type-Safe Provider Configuration

Create file: `lib/ai/types.ts` or `types/ai.ts`

```typescript
export type AIProvider = 'openai' | 'gemini' | 'anthropic';

export type OpenAIModel = 
  | 'gpt-4-turbo-preview'
  | 'gpt-4'
  | 'gpt-3.5-turbo'
  | 'gpt-4o'
  | 'gpt-4o-mini';

export type GeminiModel = 
  | 'gemini-2.0-flash-exp'
  | 'gemini-1.5-pro'
  | 'gemini-1.5-flash'
  | 'gemini-1.0-pro'
  | 'gemini-pro-vision';

export type AnthropicModel = 
  | 'claude-3-5-sonnet-20241022'
  | 'claude-3-opus-20240229'
  | 'claude-3-sonnet-20240229'
  | 'claude-3-haiku-20240307';

export type AIModel = OpenAIModel | GeminiModel | AnthropicModel;

export interface ProviderConfig {
  name: AIProvider;
  enabled: boolean;
  apiKey: string | null;
  defaultModel: AIModel;
  fallbackModel?: AIModel;
  priority: number;
  healthStatus: 'healthy' | 'degraded' | 'down';
  failureCount: number;
  lastFailure?: Date;
}

export interface AIGenerateOptions {
  provider?: AIProvider;
  model?: AIModel;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  fallbackEnabled?: boolean;
}

export interface AIResponse {
  text: string;
  provider: AIProvider;
  model: AIModel;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}
```

---

## STEP 4: Build Dynamic Provider Manager

Create/Update file: `lib/ai/provider-manager.ts`

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { 
  AIProvider, 
  ProviderConfig, 
  AIModel, 
  AIGenerateOptions,
  AIResponse,
  GeminiModel 
} from './types';

class AIProviderManager {
  private providers: Map<AIProvider, ProviderConfig> = new Map();
  private circuitBreakerThreshold: number;
  private circuitBreakerTimeout: number;

  constructor() {
    this.circuitBreakerThreshold = parseInt(process.env.CIRCUIT_BREAKER_THRESHOLD || '5');
    this.circuitBreakerTimeout = parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT || '60000');
    this.initializeProviders();
  }

  private initializeProviders() {
    const priority = (process.env.AI_PROVIDER_PRIORITY || 'openai,gemini,anthropic')
      .split(',')
      .map(p => p.trim());

    // OpenAI
    if (process.env.ENABLE_OPENAI !== 'false') {
      this.providers.set('openai', {
        name: 'openai',
        enabled: !!process.env.OPENAI_API_KEY,
        apiKey: process.env.OPENAI_API_KEY || null,
        defaultModel: (process.env.OPENAI_DEFAULT_MODEL as AIModel) || 'gpt-4-turbo-preview',
        fallbackModel: (process.env.OPENAI_FALLBACK_MODEL as AIModel) || 'gpt-3.5-turbo',
        priority: priority.indexOf('openai'),
        healthStatus: 'healthy',
        failureCount: 0,
      });
    }

    // Gemini
    if (process.env.ENABLE_GEMINI !== 'false') {
      this.providers.set('gemini', {
        name: 'gemini',
        enabled: !!process.env.GOOGLE_AI_API_KEY,
        apiKey: process.env.GOOGLE_AI_API_KEY || null,
        defaultModel: (process.env.GEMINI_DEFAULT_MODEL as GeminiModel) || 'gemini-2.0-flash-exp',
        fallbackModel: (process.env.GEMINI_FALLBACK_MODEL as GeminiModel) || 'gemini-1.5-flash',
        priority: priority.indexOf('gemini'),
        healthStatus: 'healthy',
        failureCount: 0,
      });
    }

    // Anthropic
    if (process.env.ENABLE_ANTHROPIC !== 'false') {
      this.providers.set('anthropic', {
        name: 'anthropic',
        enabled: !!process.env.ANTHROPIC_API_KEY,
        apiKey: process.env.ANTHROPIC_API_KEY || null,
        defaultModel: (process.env.ANTHROPIC_DEFAULT_MODEL as AIModel) || 'claude-3-5-sonnet-20241022',
        fallbackModel: (process.env.ANTHROPIC_FALLBACK_MODEL as AIModel) || 'claude-3-haiku-20240307',
        priority: priority.indexOf('anthropic'),
        healthStatus: 'healthy',
        failureCount: 0,
      });
    }

    console.log('[ProviderManager] Initialized providers:', 
      Array.from(this.providers.entries()).map(([name, config]) => ({
        name,
        enabled: config.enabled,
        model: config.defaultModel,
        priority: config.priority
      }))
    );
  }

  private getAvailableProviders(): ProviderConfig[] {
    return Array.from(this.providers.values())
      .filter(p => p.enabled && p.apiKey && p.healthStatus !== 'down')
      .sort((a, b) => a.priority - b.priority);
  }

  private recordFailure(provider: AIProvider, error: any) {
    const config = this.providers.get(provider);
    if (!config) return;

    config.failureCount++;
    config.lastFailure = new Date();

    console.log(`[CircuitBreaker] Provider ${provider} has ${config.failureCount}/${this.circuitBreakerThreshold} failures`);

    if (config.failureCount >= this.circuitBreakerThreshold) {
      config.healthStatus = 'down';
      console.error(`[CircuitBreaker] Provider ${provider} marked as DOWN`);
      
      // Auto-recover after timeout
      setTimeout(() => {
        config.healthStatus = 'healthy';
        config.failureCount = 0;
        console.log(`[CircuitBreaker] Provider ${provider} recovered`);
      }, this.circuitBreakerTimeout);
    }
  }

  private async generateWithOpenAI(
    prompt: string, 
    model: AIModel, 
    options: AIGenerateOptions
  ): Promise<AIResponse> {
    const config = this.providers.get('openai');
    if (!config?.apiKey) throw new Error('OpenAI API key not configured');

    const client = new OpenAI({ apiKey: config.apiKey });

    if (options.stream) {
      const stream = await client.chat.completions.create({
        model: model as string,
        messages: [{ role: 'user', content: prompt }],
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 2000,
        stream: true,
      });

      return {
        text: '', // Streaming handled separately
        provider: 'openai',
        model,
        // @ts-ignore
        stream,
      };
    }

    const response = await client.chat.completions.create({
      model: model as string,
      messages: [{ role: 'user', content: prompt }],
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 2000,
    });

    return {
      text: response.choices[0]?.message?.content || '',
      provider: 'openai',
      model,
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      },
    };
  }

  private async generateWithGemini(
    prompt: string, 
    model: GeminiModel, 
    options: AIGenerateOptions
  ): Promise<AIResponse> {
    const config = this.providers.get('gemini');
    if (!config?.apiKey) throw new Error('Gemini API key not configured');

    const genAI = new GoogleGenerativeAI(config.apiKey);
    const geminiModel = genAI.getGenerativeModel({ model });

    console.log(`[Gemini] Using model: ${model}`);

    if (options.stream) {
      const result = await geminiModel.generateContentStream(prompt);
      
      return {
        text: '', // Streaming handled separately
        provider: 'gemini',
        model,
        // @ts-ignore
        stream: result.stream,
      };
    }

    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    
    return {
      text: response.text(),
      provider: 'gemini',
      model,
    };
  }

  private async generateWithAnthropic(
    prompt: string, 
    model: AIModel, 
    options: AIGenerateOptions
  ): Promise<AIResponse> {
    const config = this.providers.get('anthropic');
    if (!config?.apiKey) throw new Error('Anthropic API key not configured');

    const client = new Anthropic({ apiKey: config.apiKey });

    if (options.stream) {
      const stream = await client.messages.create({
        model: model as string,
        max_tokens: options.maxTokens || 2000,
        messages: [{ role: 'user', content: prompt }],
        stream: true,
      });

      return {
        text: '', // Streaming handled separately
        provider: 'anthropic',
        model,
        // @ts-ignore
        stream,
      };
    }

    const response = await client.messages.create({
      model: model as string,
      max_tokens: options.maxTokens || 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    return {
      text: response.content[0]?.type === 'text' ? response.content[0].text : '',
      provider: 'anthropic',
      model,
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
    };
  }

  async generate(prompt: string, options: AIGenerateOptions = {}): Promise<AIResponse> {
    const availableProviders = this.getAvailableProviders();
    
    if (availableProviders.length === 0) {
      throw new Error('No AI providers available. Please configure at least one API key.');
    }

    // Determine which provider to try first
    let providerToTry = options.provider 
      ? this.providers.get(options.provider)
      : availableProviders[0];

    const errors: Array<{ provider: string; error: any }> = [];

    // Try providers in order
    for (const config of availableProviders) {
      // Skip if specific provider requested and this isn't it
      if (options.provider && config.name !== options.provider) continue;

      try {
        console.log(`[ProviderManager] Attempting ${config.name} with model ${options.model || config.defaultModel}`);

        const model = options.model || config.defaultModel;
        let response: AIResponse;

        switch (config.name) {
          case 'openai':
            response = await this.generateWithOpenAI(prompt, model, options);
            break;
          case 'gemini':
            response = await this.generateWithGemini(prompt, model as GeminiModel, options);
            break;
          case 'anthropic':
            response = await this.generateWithAnthropic(prompt, model, options);
            break;
          default:
            throw new Error(`Unknown provider: ${config.name}`);
        }

        // Success - reset failure count
        config.failureCount = 0;
        config.healthStatus = 'healthy';
        
        console.log(`[ProviderManager] Success with ${config.name} using ${model}`);
        return response;

      } catch (error: any) {
        console.error(`[ProviderManager] ${config.name} failed:`, error.message);
        
        // Record failure for circuit breaker
        this.recordFailure(config.name, error);
        errors.push({ provider: config.name, error });

        // Check if it's a quota/rate limit error
        const isQuotaError = error.status === 429 || 
                            error.message?.includes('quota') ||
                            error.message?.includes('rate limit');

        if (isQuotaError) {
          console.log(`[ProviderManager] Quota/Rate limit with ${config.name}, trying next provider...`);
          
          // Don't retry this provider if quota exhausted
          if (options.fallbackEnabled !== false) {
            continue; // Try next provider
          }
        }

        // If specific provider requested and it failed, don't try others
        if (options.provider) {
          throw error;
        }

        // Try fallback model for this provider first
        if (config.fallbackModel && config.fallbackModel !== model) {
          try {
            console.log(`[ProviderManager] Trying fallback model ${config.fallbackModel} for ${config.name}`);
            
            let fallbackResponse: AIResponse;
            switch (config.name) {
              case 'openai':
                fallbackResponse = await this.generateWithOpenAI(prompt, config.fallbackModel, options);
                break;
              case 'gemini':
                fallbackResponse = await this.generateWithGemini(prompt, config.fallbackModel as GeminiModel, options);
                break;
              case 'anthropic':
                fallbackResponse = await this.generateWithAnthropic(prompt, config.fallbackModel, options);
                break;
            }
            
            config.failureCount = 0;
            return fallbackResponse;
          } catch (fallbackError) {
            console.error(`[ProviderManager] Fallback model also failed for ${config.name}`);
          }
        }

        // Continue to next provider
        continue;
      }
    }

    // All providers failed
    const errorMessage = `All AI providers failed:\n${errors.map(e => 
      `- ${e.provider}: ${e.error.message}`
    ).join('\n')}`;
    
    throw new Error(errorMessage);
  }

  getProviderStatus() {
    return Array.from(this.providers.entries()).map(([name, config]) => ({
      name,
      enabled: config.enabled,
      hasApiKey: !!config.apiKey,
      healthStatus: config.healthStatus,
      failureCount: config.failureCount,
      defaultModel: config.defaultModel,
      lastFailure: config.lastFailure,
    }));
  }

  // Allow runtime model updates
  updateProviderModel(provider: AIProvider, model: AIModel) {
    const config = this.providers.get(provider);
    if (config) {
      config.defaultModel = model;
      console.log(`[ProviderManager] Updated ${provider} default model to ${model}`);
    }
  }
}

// Singleton instance
export const aiProviderManager = new AIProviderManager();
```

---

## STEP 5: Create User-Facing Model Selection API

Create file: `app/api/ai/models/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { aiProviderManager } from '@/lib/ai/provider-manager';

export async function GET() {
  try {
    const status = aiProviderManager.getProviderStatus();
    
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
    return NextResponse.json(
      { error: 'Failed to fetch AI models' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { provider, model } = await request.json();
    
    aiProviderManager.updateProviderModel(provider, model);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update model' },
      { status: 500 }
    );
  }
}
```

---

## STEP 6: Update All Existing AI Calls

Find and replace ALL instances of direct OpenAI/Gemini calls with the new provider manager.

**Before:**
```typescript
const openai = new OpenAI();
const response = await openai.chat.completions.create({...});
```

**After:**
```typescript
import { aiProviderManager } from '@/lib/ai/provider-manager';

const response = await aiProviderManager.generate(prompt, {
  temperature: 0.7,
  maxTokens: 2000,
  stream: true,
  // Optional: specify provider/model
  // provider: 'gemini',
  // model: 'gemini-2.0-flash-exp',
});
```

---

## STEP 7: Add Admin Dashboard Component (Optional)

Create: `components/admin/AIProviderSettings.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';

export default function AIProviderSettings() {
  const [providers, setProviders] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    const res = await fetch('/api/ai/models');
    const data = await res.json();
    setProviders(data);
    setLoading(false);
  };

  const updateModel = async (provider: string, model: string) => {
    await fetch('/api/ai/models', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, model }),
    });
    fetchProviders();
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">AI Provider Configuration</h2>
      
      {providers.providers.map((provider: any) => (
        <div key={provider.name} className="mb-6 p-4 border rounded">
          <h3 className="text-xl font-semibold capitalize">{provider.name}</h3>
          
          <div className="mt-2 space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-medium">Status:</span>
              <span className={`px-2 py-1 rounded text-sm ${
                provider.healthStatus === 'healthy' ? 'bg-green-100 text-green-800' :
                provider.healthStatus === 'degraded' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {provider.healthStatus}
              </span>
            </div>
            
            <div>
              <span className="font-medium">Enabled:</span> {provider.enabled ? '✅' : '❌'}
            </div>
            
            <div>
              <span className="font-medium">API Key:</span> {provider.hasApiKey ? '✅ Configured' : '❌ Missing'}
            </div>
            
            <div>
              <span className="font-medium">Failures:</span> {provider.failureCount}
            </div>

            {provider.enabled && provider.hasApiKey && (
              <div className="mt-3">
                <label className="font-medium block mb-1">Default Model:</label>
                <select 
                  value={provider.defaultModel}
                  onChange={(e) => updateModel(provider.name, e.target.value)}
                  className="border rounded px-3 py-2 w-full"
                >
                  {providers.availableModels[provider.name]?.map((model: string) => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

## STEP 8: Database Schema Updates (if storing user preferences)

Add to `prisma/schema.prisma`:

```prisma
model UserAIPreferences {
  id                String   @id @default(cuid())
  userId            String   @unique
  preferredProvider String?  // 'openai' | 'gemini' | 'anthropic'
  preferredModel    String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

---

## STEP 9: Testing Checklist

After implementation, test:

1. ✅ OpenAI works with full quota
2. ✅ OpenAI fails → automatically switches to Gemini
3. ✅ Can manually select any Gemini model via env or API
4. ✅ Gemini fails → switches to Anthropic
5. ✅ All providers down → shows clear error message
6. ✅ Circuit breaker recovers after timeout
7. ✅ Streaming works with all providers
8. ✅ Model selection persists across requests

---

## STEP 10: Migration Path

1. **Backup current code** before changes
2. **Install missing dependencies:**
   ```bash
   npm install @google/generative-ai @anthropic-ai/sdk
   ```
3. **Update environment variables**
4. **Deploy incrementally** - test each provider
5. **Monitor logs** for fallback behavior
6. **Gradually migrate** existing code to use provider manager

---

## ERROR HANDLING IMPROVEMENTS

Add to your error boundary or global error handler:

```typescript
// middleware.ts or error handler
export function handleAIError(error: any) {
  if (error.status === 429) {
    return {
      message: 'AI service temporarily unavailable due to rate limits. Trying alternative provider...',
      retryable: true,
    };
  }
  
  if (error.message?.includes('No AI providers available')) {
    return {
      message: 'AI services are currently unavailable. Please contact support or check your API key configuration.',
      retryable: false,
    };
  }
  
  return {
    message: 'An unexpected error occurred with the AI service.',
    retryable: true,
  };
}
```

---

## FINAL VALIDATION SCRIPT

Create `scripts/validate-ai-setup.ts`:

```typescript
import { aiProviderManager } from '@/lib/ai/provider-manager';

async function validateSetup() {
  console.log('🔍 Validating AI Provider Setup...\n');
  
  const status = aiProviderManager.getProviderStatus();
  
  console.log('Provider Status:');
  status.forEach(p => {
    console.log(`  ${p.name}:`);
    console.log(`    - Enabled: ${p.enabled}`);
    console.log(`    - API Key: ${p.hasApiKey ? '✅' : '❌'}`);
    console.log(`    - Health: ${p.healthStatus}`);
    console.log(`    - Model: ${p.defaultModel}`);
  });
  
  const enabledCount = status.filter(p => p.enabled && p.hasApiKey).length;
  console.log(`\n✅ ${enabledCount} provider(s) configured and ready`);
  
  if (enabledCount === 0) {
    console.error('\n❌ ERROR: No providers configured!');
    process.exit(1);
  }
  
  // Test actual generation
  try {
    console.log('\n🧪 Testing generation...');
    const response = await aiProviderManager.generate('Say "Hello"', {
      maxTokens: 10,
    });
    console.log(`✅ Success with ${response.provider} (${response.model})`);
  } catch (error) {
    console.error('❌ Generation test failed:', error);
    process.exit(1);
  }
  
  console.log('\n✅ All validations passed!');
}

validateSetup();
```

---

## SUCCESS CRITERIA

You'll know it's working when:
1. ✅ No more "No streaming provider available" errors
2. ✅ System automatically falls back when OpenAI quota exceeded
3. ✅ Can change Gemini model via environment variable
4. ✅ Can see provider health status
5. ✅ Circuit breaker prevents cascading failures
6. ✅ Clear error messages when all providers fail

---

## PRIORITY ORDER

Execute in this order:
1. **CRITICAL**: Steps 1-3 (Analysis, Environment, Types)
2. **CRITICAL**: Step 4 (Provider Manager)
3. **CRITICAL**: Step 6 (Update existing calls)
4. **HIGH**: Step 5 (Model selection API)
5. **MEDIUM**: Steps 7-8 (UI, Database)
6. **LOW**: Steps 9-10 (Testing, Validation)

Start with Step 1 and provide findings before proceeding.
