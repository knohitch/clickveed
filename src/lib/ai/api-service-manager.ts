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

type ProviderSkipReason = 'missing_key' | 'not_implemented' | 'unsupported_capability' | 'circuit_open' | 'recently_unhealthy';

function logProviderSkip(feature: AICapability, provider: string, reason: ProviderSkipReason): void {
  console.log(JSON.stringify({ event: 'provider_skip', feature, provider, reason, at: new Date().toISOString() }));
}

function logProviderSelection(feature: AICapability, provider: string): void {
  console.log(JSON.stringify({ event: 'provider_selected', feature, provider, at: new Date().toISOString() }));
}

function logFallback(feature: AICapability, provider: string, reason: string): void {
  console.warn(JSON.stringify({ event: 'provider_fallback', feature, provider, reason, at: new Date().toISOString() }));
}

async function selectProviderForCapability(capability: AICapability): Promise<ProviderInfo> {
  const { apiKeys } = await getAdminSettings();
  const candidates = getProvidersForCapability(capability);

  for (const candidate of candidates) {
    const provider = candidate.name;
    const apiKey = apiKeys[provider as keyof typeof apiKeys];

    if (!apiKey) {
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
    errorMessage.includes('quota') ||
    errorMessage.includes('insufficient_quota') ||
    errorMessage.includes('rate limit') ||
    errorMessage.includes('Too Many Requests')
  );
}

// These functions create a new Genkit instance with the appropriate API keys
// for each request, ensuring the correct provider is used
// NOW WITH CIRCUIT BREAKER TRACKING AND QUOTA FALLBACK
export async function generateWithProvider(req: Omit<GenerateRequest, 'model'>) {
  const { apiKeys } = await getAdminSettings();
  const providerPriority = getProvidersForCapability('text')
    .filter((p) => p.implemented && providerSupportsCapability(p.name, 'text'))
    .map((p) => p.name);

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
      const response = await client.generateText(req.messages);

      // Record success
      circuitBreaker.recordSuccess(providerName);
      markProviderHealthy(providerName);

      console.log(`[ProviderManager] Successfully generated text with ${providerName}`);

      // Return in Genkit-compatible format
      const modelMap: Record<string, string> = {
        'gemini': MODEL_CONSTANTS.GEMINI_TEXT_MODEL,
        'claude': MODEL_CONSTANTS.CLAUDE_TEXT_MODEL,
      };
      return {
        model: modelMap[providerName] || 'openai/gpt-4o',
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
  const providerPriority = getProvidersForCapability('text_stream')
    .filter((p) => p.implemented && providerSupportsCapability(p.name, 'text_stream'))
    .map((p) => p.name);

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
      const stream = await client.generateTextStream(req.messages);

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
  const providerInfo = await getAvailableImageGenerator();

  // Use custom client implementations for image providers
  const customProviders = ['replicate', 'stableDiffusion', 'midjourney', 'imagen'];

  if (customProviders.includes(providerInfo.provider)) {
    try {
      const client = await createProviderClient(providerInfo.provider);
      const prompt = req.messages.map(msg => {
        if (Array.isArray(msg.content)) {
          return msg.content[0]?.text || '';
        }
        return typeof msg.content === 'string' ? msg.content : '';
      }).join(' ');
      const response = await client.generateImage(prompt, providerInfo.model);

      // Record success
      circuitBreaker.recordSuccess(providerInfo.provider);
      markProviderHealthy(providerInfo.provider);

      return {
        model: providerInfo.model,
        result: {
          role: 'model' as const,
          content: [{ text: `Image generated: ${response.imageUrl}` }]
        }
      };
    } catch (error) {
      circuitBreaker.recordFailure(providerInfo.provider);
      markProviderUnhealthy(providerInfo.provider, error instanceof Error ? error.message : 'Unknown error');
      console.error(`Error generating image with ${providerInfo.provider}:`, error);
      throw error;
    }
  } else {
    try {
      const genkitInstance = createGenkitInstance({ [providerInfo.provider]: providerInfo.apiKey });
      const result = await genkitInstance.generate({ ...req, model: providerInfo.model });
      circuitBreaker.recordSuccess(providerInfo.provider);
      markProviderHealthy(providerInfo.provider);
      return result;
    } catch (error) {
      circuitBreaker.recordFailure(providerInfo.provider);
      markProviderUnhealthy(providerInfo.provider, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }
}

export async function generateImageEditWithProvider(input: { prompt: string; imageDataUri: string }) {
  const providerInfo = await getAvailableImageEditor();
  const genkitInstance = createGenkitInstance({ [providerInfo.provider]: providerInfo.apiKey });

  const result = await genkitInstance.generate({
    model: providerInfo.model,
    prompt: [
      { text: input.prompt },
      { media: { url: input.imageDataUri } },
    ],
    config: {
      responseModalities: ['TEXT', 'IMAGE'],
    },
  });

  return result;
}

export async function generateVideoWithProvider(req: Omit<GenerateRequest, 'model'>) {
  const providerInfo = await getAvailableVideoGenerator();

  // Use custom client implementations for video providers
  const customProviders = ['heygen', 'kling', 'modelscope', 'seedance', 'wan', 'googleVeo'];

  if (customProviders.includes(providerInfo.provider)) {
    try {
      const client = await createProviderClient(providerInfo.provider);
      const prompt = req.messages.map(msg => {
        if (Array.isArray(msg.content)) {
          return msg.content[0]?.text || '';
        }
        return typeof msg.content === 'string' ? msg.content : '';
      }).join(' ');
      const response = await client.generateVideo(prompt, providerInfo.model);

      // Record success
      circuitBreaker.recordSuccess(providerInfo.provider);
      markProviderHealthy(providerInfo.provider);

      return {
        model: providerInfo.model,
        result: {
          role: 'model' as const,
          content: [{ text: `Video generated: ${response.videoUrl}` }]
        }
      };
    } catch (error) {
      circuitBreaker.recordFailure(providerInfo.provider);
      markProviderUnhealthy(providerInfo.provider, error instanceof Error ? error.message : 'Unknown error');
      console.error(`Error generating video with ${providerInfo.provider}:`, error);
      throw error;
    }
  } else {
    try {
      const genkitInstance = createGenkitInstance({ [providerInfo.provider]: providerInfo.apiKey });
      const result = await genkitInstance.generate({ ...req, model: providerInfo.model });
      circuitBreaker.recordSuccess(providerInfo.provider);
      markProviderHealthy(providerInfo.provider);
      return result;
    } catch (error) {
      circuitBreaker.recordFailure(providerInfo.provider);
      markProviderUnhealthy(providerInfo.provider, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }
}

export async function generateTtsWithProvider(req: Omit<GenerateRequest, 'model'>) {
  const providerInfo = await getAvailableTTSProvider();

  // Use custom client implementations for TTS providers
  const customProviders = ['elevenlabs', 'azureTts', 'myshell'];

  if (customProviders.includes(providerInfo.provider)) {
    try {
      const client = await createProviderClient(providerInfo.provider);
      // For TTS, we would need to extract the text from the request
      // This is a simplified implementation
      const text = req.messages.map(msg => {
        if (Array.isArray(msg.content)) {
          return msg.content[0]?.text || '';
        }
        return typeof msg.content === 'string' ? msg.content : '';
      }).join(' ');
      const response = await client.generateSpeech(text, undefined, providerInfo.model);

      // Return in Genkit-compatible format
      return {
        model: providerInfo.model,
        result: {
          role: 'model' as const,
          content: [{ text: `Speech generated: ${response.audioUrl}` }]
        }
      };
    } catch (error) {
      console.error(`Error generating TTS with ${providerInfo.provider}:`, error);
      throw error;
    }
  } else {
    // For providers with Genkit plugins, use Genkit
    const genkitInstance = createGenkitInstance({ [providerInfo.provider]: providerInfo.apiKey });
    return genkitInstance.generate({ ...req, model: providerInfo.model });
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
