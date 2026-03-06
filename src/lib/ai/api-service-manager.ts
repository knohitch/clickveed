'use server';

/**
 * @fileOverview Manages and rotates through available AI service providers.
 * This file centralizes the logic for selecting an provider based on
 * configured API keys, ensuring features degrade gracefully if a key is missing.
 *
 * ENHANCEMENTS:
 * - Circuit breaker pattern to avoid hammering failed providers
 * - Provider validation to check API keys on startup
 * - Health tracking for all providers
 */
import { createGenkitInstance } from '@/ai/genkit';
import { type Tool } from 'genkit';
import { z } from 'zod';
import { searchPexelsTool } from '@/server/ai/tools/pexels-tool';
import { searchPixabayTool } from '@/server/ai/tools/pixabay-tool';
import { getUnsplashRandomPhoto } from '@/server/ai/tools/unsplash-tool';
import { searchPexelsVideosTool } from '@/server/ai/tools/pexels-video-tool';
import { getAdminSettings } from '@/server/actions/admin-actions';
import { createProviderClient, providerSupportsCapability } from './provider-clients';
import { MODEL_CONSTANTS, getProvidersForCapability, type AICapability } from './provider-registry';
import { getProviderMetadata } from '@/lib/database-config-service';

/**
 * Circuit Breaker Implementation
 * Prevents repeated calls to failing providers
 */
class CircuitBreaker {
  private failures = new Map<string, number>();
  private lastFailureTime = new Map<string, number>();
  private openCircuits = new Set<string>();
  private readonly threshold = 5; // Max failures before opening circuit
  private readonly timeout = 60000; // 1 minute cooldown

  shouldAttempt(provider: string): boolean {
    // If circuit is open, check if cooldown has passed
    if (this.openCircuits.has(provider)) {
      const lastFailure = this.lastFailureTime.get(provider) || 0;
      const timeSinceFailure = Date.now() - lastFailure;

      if (timeSinceFailure >= this.timeout) {
        // Try to close the circuit (half-open state)
        console.log(`[CircuitBreaker] Attempted to close circuit for ${provider} after ${timeSinceFailure}ms cooldown`);
        this.openCircuits.delete(provider);
        this.failures.set(provider, 0);
        return true;
      }

      console.log(`[CircuitBreaker] Circuit open for ${provider}, skipping (${this.timeout - timeSinceFailure}ms remaining)`);
      return false;
    }

    return true;
  }

  recordFailure(provider: string): void {
    const failures = (this.failures.get(provider) || 0) + 1;
    this.failures.set(provider, failures);
    this.lastFailureTime.set(provider, Date.now());

    if (failures >= this.threshold) {
      console.warn(`[CircuitBreaker] Opening circuit for ${provider} after ${failures} failures`);
      this.openCircuits.add(provider);
    } else {
      console.log(`[CircuitBreaker] Provider ${provider} has ${failures}/${this.threshold} failures`);
    }
  }

  recordSuccess(provider: string): void {
    // Reset failure count on success
    if (this.failures.get(provider)) {
      console.log(`[CircuitBreaker] Resetting failure count for ${provider}`);
    }
    this.failures.delete(provider);
    this.lastFailureTime.delete(provider);
    this.openCircuits.delete(provider);
  }

  getStatus(provider: string): { failures: number; isOpen: boolean } {
    return {
      failures: this.failures.get(provider) || 0,
      isOpen: this.openCircuits.has(provider)
    };
  }

  reset(): void {
    this.failures.clear();
    this.lastFailureTime.clear();
    this.openCircuits.clear();
    console.log('[CircuitBreaker] All circuits reset');
  }
}

// Global circuit breaker instance
const circuitBreaker = new CircuitBreaker();

/**
 * Provider Health Tracking
 */
interface ProviderHealth {
  lastChecked: number;
  isHealthy: boolean;
  lastError?: string;
}

const providerHealth = new Map<string, ProviderHealth>();

/**
 * Reset all provider health and circuit breaker state.
 * Called when API keys are updated to ensure fresh providers aren't blocked
 * by stale failure data from previous keys.
 */
export async function resetProviderStates(): Promise<void> {
  providerHealth.clear();
  circuitBreaker.reset();
  console.log('[APIServiceManager] All provider states and circuit breakers reset');
}

function markProviderHealthy(provider: string): void {
  providerHealth.set(provider, {
    lastChecked: Date.now(),
    isHealthy: true
  });
}

function markProviderUnhealthy(provider: string, error: string): void {
  providerHealth.set(provider, {
    lastChecked: Date.now(),
    isHealthy: false,
    lastError: error
  });
}

function getProviderHealth(provider: string): ProviderHealth | undefined {
  return providerHealth.get(provider);
}

// Define request types locally as they are no longer exported from genkit
type MessageRole = 'user' | 'model' | 'system' | 'tool';

interface Message {
  role: MessageRole;
  content: Array<{ text: string }>;
}

interface GenerateRequest {
  model?: string;
  messages: Message[];
  config?: any;
}

interface GenerateStreamRequest extends GenerateRequest {}

interface ProviderInfo {
  model: string;
  provider: string;
  apiKey: string;
}

async function withGlobalAppContext(messages: Message[]): Promise<Message[]> {
  const { appName } = await getAdminSettings();
  const today = new Date().toISOString().slice(0, 10);
  const context = `Platform context: The application name is "${appName || 'AI Video Creator'}". Current date is ${today}. When referring to the current year/date, use this context unless the user explicitly asks about historical data.`;

  return [
    { role: 'system', content: [{ text: context }] },
    ...messages,
  ];
}

type ProviderSkipReason = 'missing_key' | 'not_implemented' | 'unsupported_capability' | 'circuit_open' | 'recently_unhealthy' | 'setup_required';

function logProviderSkip(feature: AICapability, provider: string, reason: ProviderSkipReason): void {
  console.log(JSON.stringify({ event: 'provider_skip', feature, provider, reason, at: new Date().toISOString() }));
}

function logProviderSelection(feature: AICapability, provider: string): void {
  console.log(JSON.stringify({ event: 'provider_selected', feature, provider, at: new Date().toISOString() }));
}

function logFallback(feature: AICapability, provider: string, reason: string): void {
  console.warn(JSON.stringify({ event: 'provider_fallback', feature, provider, reason, at: new Date().toISOString() }));
}

function hasGoogleVertexRuntimeSetup(apiKeys: Record<string, string>): boolean {
  const hasProjectId = Boolean(
    apiKeys.googleCloudProjectId ||
    process.env.GOOGLE_CLOUD_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT
  );

  const hasInlineCredentials = Boolean(
    apiKeys.googleApplicationCredentialsJson ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
  );

  const hasCredentialsPath = Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS);
  // Backward-compatible mode: allow direct OAuth bearer token in provider key.
  const hasLegacyAccessToken = Boolean(apiKeys.imagen || apiKeys.googleVeo);

  return hasProjectId && (hasInlineCredentials || hasCredentialsPath || hasLegacyAccessToken);
}

async function isProviderSetupBlocked(provider: string, apiKeys: Record<string, string>): Promise<boolean> {
  const metadata = await getProviderMetadata(provider);
  if (!metadata?.requiresSetup) {
    return false;
  }

  if (metadata.authType === 'oauth' && (provider === 'imagen' || provider === 'googleVeo')) {
    return !hasGoogleVertexRuntimeSetup(apiKeys);
  }

  return true;
}

async function selectProviderForCapability(capability: AICapability): Promise<ProviderInfo> {
  const { apiKeys } = await getAdminSettings();
  const candidates = getProvidersForCapability(capability);

  for (const candidate of candidates) {
    const provider = candidate.name;
    const apiKey = (apiKeys[provider as keyof typeof apiKeys] || '') as string;
    const metadata = await getProviderMetadata(provider);
    const requiresApiKey = metadata.authType === 'apiKey';

    if (requiresApiKey && !apiKey) {
      logProviderSkip(capability, provider, 'missing_key');
      continue;
    }

    if (!candidate.implemented) {
      logProviderSkip(capability, provider, 'not_implemented');
      continue;
    }

    if (!providerSupportsCapability(provider, capability)) {
      logProviderSkip(capability, provider, 'unsupported_capability');
      continue;
    }

    if (await isProviderSetupBlocked(provider, apiKeys as Record<string, string>)) {
      logProviderSkip(capability, provider, 'setup_required');
      continue;
    }

    if (!circuitBreaker.shouldAttempt(provider)) {
      logProviderSkip(capability, provider, 'circuit_open');
      continue;
    }

    const health = getProviderHealth(provider);
    if (health && !health.isHealthy) {
      const timeSinceCheck = Date.now() - health.lastChecked;
      if (timeSinceCheck < 300000) {
        logProviderSkip(capability, provider, 'recently_unhealthy');
        continue;
      }
    }

    logProviderSelection(capability, provider);
    return {
      model: candidate.model,
      provider,
      apiKey,
    };
  }
  throw new Error(`No healthy ${capability} provider available. Please configure at least one supported API key.`);
}

export async function getAvailableTextGenerator() {
  return selectProviderForCapability('text');
}

export async function getAvailableImageGenerator() {
  return selectProviderForCapability('image');
}

export async function getAvailableImageEditor() {
  return selectProviderForCapability('image_edit');
}

export async function getAvailableVideoGenerator() {
  return selectProviderForCapability('video');
}

export async function getAvailableTTSProvider() {
  return selectProviderForCapability('tts');
}

export async function getAvailableStockPhotoTool() {
  const { apiKeys } = await getAdminSettings();
  const toolPriority = ['pexels', 'pixabay', 'unsplash'];
  const toolMap: Record<string, Tool> = {
    pexels: searchPexelsTool,
    pixabay: searchPixabayTool,
    unsplash: getUnsplashRandomPhoto
  };

  for (const toolKey of toolPriority) {
    if (apiKeys[toolKey as keyof typeof apiKeys]) {
      return toolMap[toolKey];
    }
  }

  throw new Error("No stock photo API key configured. Please set PEXELS_API_KEY, PIXABAY_API_KEY, or UNSPLASH_API_KEY in your environment.");
}

/**
 * Get available stock video tool based on configured API keys
 * Currently only supports Pexels for videos
 */
export async function getAvailableStockVideoTool() {
  const { apiKeys } = await getAdminSettings();

  // For now, we only have Pexels for videos, but this structure
  // allows for adding more providers in the future
  if (apiKeys.pexels) {
    return searchPexelsVideosTool;
  }

  throw new Error("No stock video API key configured. Please set PEXELS_API_KEY in the admin settings.");
}

// Helper function to check if error is a quota error
function isQuotaError(error: unknown): boolean {
  const errorMessage = error instanceof Error ? error.message : String(error);
  return (
    errorMessage.includes('429') ||
    errorMessage.includes('402') ||
    errorMessage.includes('quota') ||
    errorMessage.includes('insufficient_quota') ||
    errorMessage.includes('rate limit') ||
    errorMessage.includes('Too Many Requests') ||
    errorMessage.includes('No credits') ||
    errorMessage.includes('credits exhausted') ||
    errorMessage.includes('subscription') ||
    errorMessage.includes('expired')
  );
}

function isMinimaxCreditOrSubscriptionError(error: unknown): boolean {
  const errorMessage = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return (
    errorMessage.includes('no credits') ||
    errorMessage.includes('credits exhausted') ||
    errorMessage.includes('insufficient credit') ||
    errorMessage.includes('subscription') ||
    errorMessage.includes('expired') ||
    errorMessage.includes('402') ||
    errorMessage.includes('payment required')
  );
}

function isMinimaxAuthError(error: unknown): boolean {
  const errorMessage = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return (
    errorMessage.includes('invalid api key') ||
    errorMessage.includes('unauthorized') ||
    errorMessage.includes('authentication') ||
    errorMessage.includes('forbidden') ||
    errorMessage.includes('401') ||
    errorMessage.includes('403')
  );
}

const geminiImageModelCache = new Map<string, { expiresAt: number; models: string[] }>();
const GEMINI_IMAGE_MODEL_CACHE_TTL_MS = 30 * 60 * 1000;
const GEMINI_LIST_MODELS_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

function normalizeGoogleAiModel(model: string): string {
  const value = model.trim();
  if (!value) return value;
  if (value.startsWith('googleai/')) return value;
  if (value.startsWith('models/')) return `googleai/${value.slice('models/'.length)}`;
  return `googleai/${value}`;
}

function toRawGoogleModel(model: string): string {
  const value = model.trim();
  if (!value) return value;
  if (value.startsWith('googleai/')) return value.slice('googleai/'.length);
  if (value.startsWith('models/')) return value.slice('models/'.length);
  return value;
}

function uniqModels(models: string[]): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const model of models) {
    const normalized = normalizeGoogleAiModel(model);
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    ordered.push(normalized);
  }
  return ordered;
}

function isLikelyGeminiImageModel(model: string): boolean {
  const raw = toRawGoogleModel(model).toLowerCase();
  if (!raw.startsWith('gemini-')) return false;
  if (raw.includes('embedding') || raw.includes('tts') || raw.includes('transcribe')) return false;
  return raw.includes('image') || raw.includes('flash');
}

function scoreGeminiImageModel(model: string): number {
  const raw = toRawGoogleModel(model).toLowerCase();
  let score = 0;
  if (raw.includes('image')) score += 100;
  if (raw.includes('flash')) score += 30;
  if (raw.includes('2.5')) score += 15;
  if (raw.includes('2.0')) score += 5;
  if (raw.includes('preview')) score -= 20;
  if (raw.includes('exp')) score -= 15;
  return score;
}

async function discoverGeminiImageModels(apiKey: string): Promise<string[]> {
  const cacheKey = apiKey;
  const cached = geminiImageModelCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.models;
  }

  try {
    const response = await fetch(`${GEMINI_LIST_MODELS_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
      method: 'GET',
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Gemini ListModels failed with status ${response.status}`);
    }

    const payload = await response.json() as {
      models?: Array<{
        name?: string;
        supportedGenerationMethods?: string[];
      }>;
    };

    const discovered = (payload.models || [])
      .filter((model) => Array.isArray(model.supportedGenerationMethods) && model.supportedGenerationMethods.includes('generateContent'))
      .map((model) => model.name || '')
      .filter((name) => !!name)
      .map((name) => normalizeGoogleAiModel(name))
      .filter((name) => isLikelyGeminiImageModel(name))
      .sort((a, b) => scoreGeminiImageModel(b) - scoreGeminiImageModel(a));

    const models = uniqModels(discovered);
    geminiImageModelCache.set(cacheKey, {
      expiresAt: Date.now() + GEMINI_IMAGE_MODEL_CACHE_TTL_MS,
      models,
    });
    return models;
  } catch (error) {
    console.warn('[Gemini Image Models] Discovery failed, using static fallbacks:', error);
    return [];
  }
}

async function getGeminiImageEditModelPool(apiKey: string, preferredModel: string): Promise<string[]> {
  const configured = [
    preferredModel,
    MODEL_CONSTANTS.GEMINI_IMAGE_MODEL,
    process.env.GEMINI_IMAGE_MODEL || '',
    'googleai/gemini-2.5-flash-image',
  ].filter(Boolean);

  const discovered = await discoverGeminiImageModels(apiKey);
  return uniqModels([...configured, ...discovered]);
}

function isGeminiModelCompatibilityError(error: unknown): boolean {
  const message = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return (
    message.includes('404') ||
    message.includes('400') ||
    message.includes('not found') ||
    message.includes('unsupported') ||
    message.includes('does not support') ||
    message.includes('response modalities') ||
    message.includes('invalid argument')
  );
}

// These functions create a new Genkit instance with the appropriate API keys
// for each request, ensuring the correct provider is used
// NOW WITH CIRCUIT BREAKER TRACKING AND QUOTA FALLBACK
export async function generateWithProvider(req: Omit<GenerateRequest, 'model'>) {
  const { apiKeys } = await getAdminSettings();
  const contextualMessages = await withGlobalAppContext(req.messages);
  const textProviders = getProvidersForCapability('text')
    .filter((p) => p.implemented && providerSupportsCapability(p.name, 'text'))
  const providerPriority = textProviders.map((p) => p.name);

  let lastError: Error | null = null;

  for (const providerName of providerPriority) {
    const apiKey = apiKeys[providerName as keyof typeof apiKeys];
    if (!apiKey) continue;

    // Skip if circuit breaker is open
    if (!circuitBreaker.shouldAttempt(providerName)) {
      console.log(`[ProviderManager] Skipping ${providerName} due to circuit breaker`);
      continue;
    }

    try {
      const client = await createProviderClient(providerName);
      const providerModel = textProviders.find((p) => p.name === providerName)?.model;
      // Provider clients expect raw model ids (without provider prefix like "googleai/").
      const normalizedModel = providerModel?.includes('/') ? providerModel.split('/').pop() : providerModel;
      const response = providerName === 'gemini'
        ? await client.generateText(contextualMessages, normalizedModel)
        : await client.generateText(contextualMessages);

      // Record success
      circuitBreaker.recordSuccess(providerName);
      markProviderHealthy(providerName);

      console.log(`[ProviderManager] Successfully generated text with ${providerName}`);

      // Return in Genkit-compatible format
      const modelMap: Record<string, string> = {
        gemini: MODEL_CONSTANTS.GEMINI_TEXT_MODEL,
        claude: MODEL_CONSTANTS.CLAUDE_TEXT_MODEL,
      };
      return {
        model: providerModel || modelMap[providerName] || 'openai/gpt-4o',
        result: {
          role: 'model' as const,
          content: [{ text: response.text }]
        }
      };
    } catch (error) {
      // Record failure
      circuitBreaker.recordFailure(providerName);

      // Check if it's a quota error
      if (isQuotaError(error)) {
        logFallback('text', providerName, 'quota_or_rate_limit');
        lastError = error instanceof Error ? error : new Error(String(error));
        continue; // Try next provider
      }

      // For non-quota errors, check health status
      const health = getProviderHealth(providerName);
      if (health && !health.isHealthy) {
        const timeSinceCheck = Date.now() - health.lastChecked;
        if (timeSinceCheck < 300000) {
          console.log(`[ProviderManager] Skipping ${providerName} due to unhealthy status`);
          continue;
        }
      }

      markProviderUnhealthy(providerName, error instanceof Error ? error.message : 'Unknown error');
      logFallback('text', providerName, 'provider_error');
      console.error(`Error generating text with ${providerName}:`, error);

      // If this is the last provider, throw the error
      const nextProviderIndex = providerPriority.indexOf(providerName) + 1;
      const hasMoreProviders = providerPriority.slice(nextProviderIndex).some(p => apiKeys[p as keyof typeof apiKeys]);

      if (!hasMoreProviders) {
        throw error;
      }

      // Try next provider for non-quota errors too
      lastError = error instanceof Error ? error : new Error(String(error));
      continue;
    }
  }

  // All providers failed
  const allProviders = providerPriority.filter(p => apiKeys[p as keyof typeof apiKeys]);
  if (allProviders.length === 0) {
    throw new Error(
      'No AI provider API keys configured. ' +
      'Please configure at least one API key.\n' +
      'RECOMMENDED: Add Gemini API key for best compatibility.\n' +
      'Get Gemini key: https://aistudio.google.com/app/apikey\n' +
      'Get OpenAI key: https://platform.openai.com/api-keys\n' +
      'Get Anthropic key: https://console.anthropic.com/'
    );
  }

  throw lastError || new Error('All AI providers failed. Please check your API keys and try again.');
}

export async function generateStreamWithProvider(req: Omit<GenerateStreamRequest, 'model'>) {
  const settings = await getAdminSettings();
  const apiKeys = settings.apiKeys;
  const contextualMessages = await withGlobalAppContext(req.messages);
  const streamProviders = getProvidersForCapability('text_stream')
    .filter((p) => p.implemented && providerSupportsCapability(p.name, 'text_stream'))
  const providerPriority = streamProviders.map((p) => p.name);

  // Debug: Log which keys are available (names only, not values)
  const configuredProviders = providerPriority.filter(p => !!apiKeys[p as keyof typeof apiKeys]);
  console.log(`[generateStreamWithProvider] Configured streaming providers: [${configuredProviders.join(', ')}]`);
  console.log(`[generateStreamWithProvider] Total API keys in settings: ${Object.keys(apiKeys).filter(k => !!apiKeys[k]).length}`);

  if (configuredProviders.length === 0) {
    // Log all key names that DO have values to help debug
    const allConfiguredKeys = Object.entries(apiKeys).filter(([_, v]) => !!v).map(([k]) => k);
    console.error(`[generateStreamWithProvider] No streaming provider keys found! All configured keys: [${allConfiguredKeys.join(', ')}]`);
    console.error(`[generateStreamWithProvider] DATABASE_URL available: ${!!process.env.DATABASE_URL}`);
  }

  for (const providerName of providerPriority) {
    const apiKey = apiKeys[providerName as keyof typeof apiKeys];
    if (!apiKey) continue;

    // Skip if circuit breaker is open
    if (!circuitBreaker.shouldAttempt(providerName)) {
      console.log(`[ProviderManager] Skipping ${providerName} due to circuit breaker`);
      continue;
    }

    try {
      const client = await createProviderClient(providerName);
      const providerModel = streamProviders.find((p) => p.name === providerName)?.model;
      // Provider clients expect raw model ids (without provider prefix like "googleai/").
      const normalizedModel = providerModel?.includes('/') ? providerModel.split('/').pop() : providerModel;
      const stream = providerName === 'gemini'
        ? await client.generateTextStream(contextualMessages, normalizedModel)
        : await client.generateTextStream(contextualMessages);

      circuitBreaker.recordSuccess(providerName);
      markProviderHealthy(providerName);

      console.log(`[ProviderManager] Successfully streaming with ${providerName}`);

      // Create a Genkit-compatible response
      return {
        stream,
        response: Promise.resolve(null)
      };
    } catch (error) {
      circuitBreaker.recordFailure(providerName);

      // Check if it's a quota error
      if (isQuotaError(error)) {
        logFallback('text_stream', providerName, 'quota_or_rate_limit');
        continue;
      }

      markProviderUnhealthy(providerName, error instanceof Error ? error.message : 'Unknown error');
      logFallback('text_stream', providerName, 'provider_error');
      console.error(`Error streaming text with ${providerName}:`, error);

      // Try next provider
      const nextProviderIndex = providerPriority.indexOf(providerName) + 1;
      const hasMoreProviders = providerPriority.slice(nextProviderIndex).some(p => apiKeys[p as keyof typeof apiKeys]);

      if (!hasMoreProviders) {
        throw error;
      }
    }
  }

  throw new Error(
    'No streaming provider available. Please configure an API key.\n' +
    'RECOMMENDED: Add Gemini API key for best compatibility.\n' +
    'Get Gemini key: https://aistudio.google.com/app/apikey\n' +
    'Get OpenAI key: https://platform.openai.com/api-keys\n' +
    'Get Anthropic key: https://console.anthropic.com/'
  );
}

export async function generateImageWithProvider(req: Omit<GenerateRequest, 'model'>) {
  const { apiKeys } = await getAdminSettings();
  const candidates = getProvidersForCapability('image')
    .filter((p) => p.implemented && providerSupportsCapability(p.name, 'image'));
  const customProviders = ['replicate', 'stableDiffusion', 'midjourney', 'imagen'];
  let lastError: Error | null = null;
  let configuredCount = 0;
  const attemptedModelsByProvider = new Map<string, Set<string>>();
  const setupBlockedProviders: string[] = [];

  const prompt = req.messages.map(msg => {
    if (Array.isArray(msg.content)) {
      return msg.content[0]?.text || '';
    }
    return typeof msg.content === 'string' ? msg.content : '';
  }).join(' ');

  for (const candidate of candidates) {
    const provider = candidate.name;
    const apiKey = (apiKeys[provider as keyof typeof apiKeys] || '') as string;
    const metadata = await getProviderMetadata(provider);
    const requiresApiKey = metadata.authType === 'apiKey';

    if (requiresApiKey && !apiKey) {
      continue;
    }
    configuredCount++;

    if (await isProviderSetupBlocked(provider, apiKeys as Record<string, string>)) {
      logProviderSkip('image', provider, 'setup_required');
      setupBlockedProviders.push(provider);
      continue;
    }

    if (!circuitBreaker.shouldAttempt(provider)) {
      logProviderSkip('image', provider, 'circuit_open');
      continue;
    }

    try {
      if (customProviders.includes(provider)) {
        const client = await createProviderClient(provider);
        const response = await client.generateImage(prompt, candidate.model);
        circuitBreaker.recordSuccess(provider);
        markProviderHealthy(provider);
        return {
          model: candidate.model,
          provider,
          result: {
            role: 'model' as const,
            content: [{ text: `Image generated: ${response.imageUrl}` }]
          }
        };
      }

      const genkitInstance = createGenkitInstance({ [provider]: apiKey });
      const attemptedModels = attemptedModelsByProvider.get(provider) || new Set<string>();
      attemptedModelsByProvider.set(provider, attemptedModels);
      const modelsToTry = provider === 'gemini'
        ? await getGeminiImageEditModelPool(apiKey, candidate.model)
        : [candidate.model];

      let modelError: Error | null = null;
      for (const model of modelsToTry) {
        const normalizedModel = normalizeGoogleAiModel(model);
        const modelKey = normalizedModel.toLowerCase();
        if (attemptedModels.has(modelKey)) {
          continue;
        }
        attemptedModels.add(modelKey);

        try {
          const result = await genkitInstance.generate({ ...req, model: normalizedModel });
          circuitBreaker.recordSuccess(provider);
          markProviderHealthy(provider);
          return {
            ...(result as any),
            provider,
            model: normalizedModel,
          };
        } catch (attemptError) {
          modelError = attemptError instanceof Error ? attemptError : new Error(String(attemptError));
          if (isQuotaError(attemptError)) {
            throw modelError;
          }
          if (provider === 'gemini' && isGeminiModelCompatibilityError(attemptError)) {
            logFallback('image', provider, `model_incompatible:${normalizedModel}`);
            continue;
          }
          continue;
        }
      }

      if (modelError) {
        throw modelError;
      }
      throw new Error(`No compatible image model found for provider ${provider}`);
    } catch (error) {
      circuitBreaker.recordFailure(provider);
      markProviderUnhealthy(provider, error instanceof Error ? error.message : 'Unknown error');
      logFallback('image', provider, isQuotaError(error) ? 'quota_or_rate_limit' : 'provider_error');
      lastError = error instanceof Error ? error : new Error(String(error));
      continue;
    }
  }

  if (configuredCount === 0) {
    throw new Error(
      'No image provider configured. Add an image API key, or configure Vertex setup (googleCloudProjectId + googleApplicationCredentialsJson) for Imagen.'
    );
  }

  if (setupBlockedProviders.length > 0 && setupBlockedProviders.length === configuredCount) {
    throw new Error(
      `Configured image provider(s) require OAuth/service-account setup: ${setupBlockedProviders.join(', ')}. ` +
      'Configure googleCloudProjectId plus either googleApplicationCredentialsJson (recommended) or a legacy OAuth access token in imagen.'
    );
  }

  throw lastError || new Error('All configured image providers failed or require additional setup.');
}

export async function generateImageEditWithProvider(input: { prompt: string; imageDataUri: string }) {
  const { apiKeys } = await getAdminSettings();
  const candidates = getProvidersForCapability('image_edit')
    .filter((p) => p.implemented && providerSupportsCapability(p.name, 'image_edit'));

  const hasMediaOutput = (result: any): boolean => {
    if (typeof result?.media?.url === 'string' && result.media.url.length > 0) {
      return true;
    }
    const messageParts = result?.message?.content;
    if (Array.isArray(messageParts) && messageParts.some((part: any) => !!part?.media?.url || !!part?.inlineData?.data)) {
      return true;
    }
    const customParts = result?.custom?.candidates?.[0]?.content?.parts;
    return Array.isArray(customParts) && customParts.some((part: any) => !!part?.inlineData?.data || !!part?.fileData?.fileUri);
  };

  let lastError: Error | null = null;
  let configuredCount = 0;
  const attemptedModelsByProvider = new Map<string, Set<string>>();

  for (const candidate of candidates) {
    const provider = candidate.name;
    const apiKey = (apiKeys[provider as keyof typeof apiKeys] || '') as string;
    const metadata = await getProviderMetadata(provider);
    const requiresApiKey = metadata.authType === 'apiKey';

    if (requiresApiKey && !apiKey) {
      logProviderSkip('image_edit', provider, 'missing_key');
      continue;
    }
    configuredCount++;

    if (await isProviderSetupBlocked(provider, apiKeys as Record<string, string>)) {
      logProviderSkip('image_edit', provider, 'setup_required');
      continue;
    }

    if (!circuitBreaker.shouldAttempt(provider)) {
      logProviderSkip('image_edit', provider, 'circuit_open');
      continue;
    }

    try {
      const genkitInstance = createGenkitInstance({ [provider]: apiKey });
      const attemptedModels = attemptedModelsByProvider.get(provider) || new Set<string>();
      attemptedModelsByProvider.set(provider, attemptedModels);
      const modelsToTry = provider === 'gemini'
        ? await getGeminiImageEditModelPool(apiKey, candidate.model)
        : [candidate.model];

      for (const model of modelsToTry) {
        const normalizedModel = normalizeGoogleAiModel(model);
        const modelKey = normalizedModel.toLowerCase();
        if (attemptedModels.has(modelKey)) {
          continue;
        }
        attemptedModels.add(modelKey);

        try {
          const runGenerate = async (modalities: Array<'TEXT' | 'IMAGE' | 'AUDIO'>) =>
            genkitInstance.generate({
              model: normalizedModel,
              prompt: [
                { text: input.prompt },
                { media: { url: input.imageDataUri } },
              ],
              config: { responseModalities: modalities },
            });

          let result = await runGenerate(['IMAGE']);
          if (!hasMediaOutput(result)) {
            result = await runGenerate(['TEXT', 'IMAGE']);
          }

          if (!hasMediaOutput(result)) {
            lastError = new Error(`Model ${normalizedModel} returned no image output`);
            continue;
          }

          circuitBreaker.recordSuccess(provider);
          markProviderHealthy(provider);
          return {
            ...(result as any),
            provider,
            model: normalizedModel,
          };
        } catch (modelError) {
          const modelErrorObj = modelError instanceof Error ? modelError : new Error(String(modelError));
          lastError = modelErrorObj;
          if (provider === 'gemini' && isGeminiModelCompatibilityError(modelError)) {
            logFallback('image_edit', provider, `model_incompatible:${normalizedModel}`);
            continue;
          }
          logFallback('image_edit', provider, isQuotaError(modelError) ? 'quota_or_rate_limit' : 'provider_error');
          continue;
        }
      }

      if (!lastError) {
        lastError = new Error(`No compatible model found for provider ${provider}`);
      }
      throw lastError;
    } catch (error) {
      circuitBreaker.recordFailure(provider);
      markProviderUnhealthy(provider, error instanceof Error ? error.message : 'Unknown error');
      lastError = error instanceof Error ? error : new Error(String(error));
      if (isQuotaError(error)) {
        logFallback('image_edit', provider, 'quota_or_rate_limit');
        continue;
      }
      logFallback('image_edit', provider, 'provider_error');
      continue;
    }
  }

  if (configuredCount === 0) {
    throw new Error('No image editing provider configured. Add a Gemini API key in admin settings.');
  }

  throw lastError || new Error('All image editing providers failed. No media was returned.');
}

export async function generateVideoWithProvider(req: Omit<GenerateRequest, 'model'>) {
  const { apiKeys } = await getAdminSettings();
  const candidates = getProvidersForCapability('video')
    .filter((p) => p.implemented && providerSupportsCapability(p.name, 'video'));
  const customProviders = ['heygen', 'kling', 'modelscope', 'seedance', 'wan', 'googleVeo'];

  let lastError: Error | null = null;
  let configuredCount = 0;
  const setupBlockedProviders: string[] = [];

  for (const candidate of candidates) {
    const provider = candidate.name;
    const apiKey = (apiKeys[provider as keyof typeof apiKeys] || '') as string;
    const metadata = await getProviderMetadata(provider);
    const requiresApiKey = metadata.authType === 'apiKey';

    if (requiresApiKey && !apiKey) {
      continue;
    }
    configuredCount++;

    if (await isProviderSetupBlocked(provider, apiKeys as Record<string, string>)) {
      logProviderSkip('video', provider, 'setup_required');
      setupBlockedProviders.push(provider);
      continue;
    }
    if (!circuitBreaker.shouldAttempt(provider)) {
      logProviderSkip('video', provider, 'circuit_open');
      continue;
    }

    try {
      if (customProviders.includes(provider)) {
        const client = await createProviderClient(provider);
        const prompt = req.messages.map(msg => {
          if (Array.isArray(msg.content)) {
            return msg.content[0]?.text || '';
          }
          return typeof msg.content === 'string' ? msg.content : '';
        }).join(' ');
        const response = await client.generateVideo(prompt, candidate.model);
        circuitBreaker.recordSuccess(provider);
        markProviderHealthy(provider);
        return {
          provider,
          model: candidate.model,
          result: {
            role: 'model' as const,
            content: [{ text: `Video generated: ${response.videoUrl}` }]
          }
        };
      }

      const genkitInstance = createGenkitInstance({ [provider]: apiKey });
      const result = await genkitInstance.generate({ ...req, model: candidate.model });
      circuitBreaker.recordSuccess(provider);
      markProviderHealthy(provider);
      return {
        ...(result as any),
        provider,
        model: candidate.model,
      };
    } catch (error) {
      circuitBreaker.recordFailure(provider);
      markProviderUnhealthy(provider, error instanceof Error ? error.message : 'Unknown error');
      logFallback('video', provider, isQuotaError(error) ? 'quota_or_rate_limit' : 'provider_error');
      lastError = error instanceof Error ? error : new Error(String(error));
      continue;
    }
  }

  if (configuredCount === 0) {
    throw new Error(
      'No video provider configured. Add a video API key, or configure Vertex setup (googleCloudProjectId + googleApplicationCredentialsJson) for Google Veo.'
    );
  }

  if (setupBlockedProviders.length > 0 && setupBlockedProviders.length === configuredCount) {
    throw new Error(
      `Configured video provider(s) require OAuth/service-account setup: ${setupBlockedProviders.join(', ')}. ` +
      'Configure googleCloudProjectId plus either googleApplicationCredentialsJson (recommended) or a legacy OAuth access token in googleVeo.'
    );
  }

  throw lastError || new Error('All configured video providers failed.');
}

export async function generateTtsWithProvider(req: Omit<GenerateRequest, 'model'>) {
  const { apiKeys } = await getAdminSettings();
  const text = req.messages.map(msg => {
    if (Array.isArray(msg.content)) {
      return msg.content[0]?.text || '';
    }
    return typeof msg.content === 'string' ? msg.content : '';
  }).join(' ');

  const callCustomTtsProvider = async (provider: 'minimax' | 'elevenlabs') => {
    const providerInfo = getProvidersForCapability('tts').find((p) => p.name === provider);
    const client = await createProviderClient(provider);
    const response = await client.generateSpeech(text, undefined, providerInfo?.model);

    circuitBreaker.recordSuccess(provider);
    markProviderHealthy(provider);

    return {
      model: providerInfo?.model || provider,
      result: {
        role: 'model' as const,
        content: [{ text: `Speech generated: ${response.audioUrl}` }]
      }
    };
  };

  const hasMinimaxKey = !!apiKeys.minimax;
  const hasElevenLabsKey = !!apiKeys.elevenlabs;

  // Policy: Minimax is primary for all TTS/audio generation.
  // ElevenLabs is used only if Minimax key is missing, or Minimax has credit/subscription exhaustion.
  if (!hasMinimaxKey) {
    if (!hasElevenLabsKey) {
      throw new Error('No TTS provider configured. Add Minimax API key (primary) or ElevenLabs API key (fallback).');
    }
    return callCustomTtsProvider('elevenlabs');
  }

  try {
    return await callCustomTtsProvider('minimax');
  } catch (error) {
    circuitBreaker.recordFailure('minimax');
    markProviderUnhealthy('minimax', error instanceof Error ? error.message : 'Unknown error');
    console.error('Error generating TTS with minimax:', error);

    if (hasElevenLabsKey && (isMinimaxCreditOrSubscriptionError(error) || isMinimaxAuthError(error))) {
      logFallback(
        'tts',
        'minimax',
        isMinimaxAuthError(error) ? 'auth_error' : 'credits_or_subscription'
      );
      try {
        return await callCustomTtsProvider('elevenlabs');
      } catch (fallbackError) {
        circuitBreaker.recordFailure('elevenlabs');
        markProviderUnhealthy('elevenlabs', fallbackError instanceof Error ? fallbackError.message : 'Unknown error');
        console.error('Error generating TTS with elevenlabs fallback:', fallbackError);
        throw fallbackError;
      }
    }

    throw error;
  }
}

/**
 * Generate text with structured output using the best available provider.
 * This function handles both Genkit providers (Gemini) and custom providers (OpenAI/Claude).
 *
 * @param prompt - The prompt to send to the model
 * @param outputSchema - Zod schema for structured output parsing
 * @returns The parsed output matching the schema
 */
export async function generateStructuredOutput<T>(
  prompt: string,
  outputSchema: z.ZodType<T>
): Promise<{ output: T | null; provider: string; model: string }> {
  const providerInfo = await getAvailableTextGenerator();

  console.log(`[generateStructuredOutput] Using provider: ${providerInfo.provider}, model: ${providerInfo.model}`);

  // Providers that don't have Genkit plugins - use custom API clients
  const customProviders = ['openai', 'azureOpenai', 'claude', 'huggingface', 'deepseek', 'grok', 'qwen', 'perplexity', 'openrouter'];

  if (customProviders.includes(providerInfo.provider)) {
    try {
      const client = await createProviderClient(providerInfo.provider);

      // Add JSON instruction to prompt for structured output
      const structuredPrompt = `${prompt}

IMPORTANT: You must respond with ONLY a valid JSON object that matches this structure. No additional text or explanation.
Return your response as a JSON object.`;

      const messages = [{ role: 'user' as const, content: [{ text: structuredPrompt }] }];
      const response = await client.generateText(messages);

      // Record success
      circuitBreaker.recordSuccess(providerInfo.provider);
      markProviderHealthy(providerInfo.provider);

      // Parse the response as JSON
      let parsed: T | null = null;
      try {
        // Try to extract JSON from the response
        const jsonMatch = response.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const jsonData = JSON.parse(jsonMatch[0]);
          parsed = outputSchema.parse(jsonData);
        }
      } catch (parseError) {
        console.error('Failed to parse structured output:', parseError);
        console.error('Response text:', response.text);
      }

      return {
        output: parsed,
        provider: providerInfo.provider,
        model: providerInfo.model
      };
    } catch (error) {
      // Record failure
      circuitBreaker.recordFailure(providerInfo.provider);
      markProviderUnhealthy(providerInfo.provider, error instanceof Error ? error.message : 'Unknown error');

      console.error(`Error generating structured output with ${providerInfo.provider}:`, error);
      throw error;
    }
  } else {
    // For providers with Genkit plugins (like Gemini), use Genkit
    try {
      const genkitInstance = createGenkitInstance({ [providerInfo.provider]: providerInfo.apiKey });
      const result = await genkitInstance.generate({
        model: providerInfo.model,
        prompt,
        output: { schema: outputSchema }
      });

      circuitBreaker.recordSuccess(providerInfo.provider);
      markProviderHealthy(providerInfo.provider);

      return {
        output: result.output,
        provider: providerInfo.provider,
        model: providerInfo.model
      };
    } catch (error) {
      circuitBreaker.recordFailure(providerInfo.provider);
      markProviderUnhealthy(providerInfo.provider, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }
}

