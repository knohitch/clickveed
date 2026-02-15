/**
 * Robust AI Provider Manager
 * Provides automatic fallback between AI providers with circuit breaker pattern
 * 
 * This is a simplified, robust provider manager that:
 * 1. Supports OpenAI, Gemini, and Anthropic
 * 2. Automatically falls back when one provider fails
 * 3. Uses circuit breaker to avoid hammering failed providers
 * 4. Supports both environment variables and admin-configured API keys
 */

import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';
import type {
  AIProvider,
  ProviderConfig,
  AIModel,
  AIGenerateOptions,
  AIResponse,
  GeminiModel
} from './types';
import { validateAIEnvironment } from './validate-env';

// Circuit Breaker Implementation
class CircuitBreaker {
  private failures = new Map<string, number>();
  private lastFailureTime = new Map<string, number>();
  private openCircuits = new Set<string>();
  private readonly threshold: number;
  private readonly timeout: number;

  constructor() {
    this.threshold = parseInt(process.env.CIRCUIT_BREAKER_THRESHOLD || '5');
    this.timeout = parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT || '60000');
  }

  shouldAttempt(provider: string): boolean {
    if (this.openCircuits.has(provider)) {
      const lastFailure = this.lastFailureTime.get(provider) || 0;
      const timeSinceFailure = Date.now() - lastFailure;

      if (timeSinceFailure >= this.timeout) {
        console.log(`[CircuitBreaker] Closing circuit for ${provider} after ${timeSinceFailure}ms cooldown`);
        this.openCircuits.delete(provider);
        this.failures.set(provider, 0);
        return true;
      }

      return false;
    }

    return true;
  }

  recordFailure(provider: string, error?: any): void {
    const failures = (this.failures.get(provider) || 0) + 1;
    this.failures.set(provider, failures);
    this.lastFailureTime.set(provider, Date.now());

    // Check for quota errors - immediately open circuit
    const isQuotaError = error && (
      error.status === 429 ||
      error.message?.includes('quota') ||
      error.message?.includes('insufficient_quota') ||
      error.message?.includes('rate limit')
    );

    if (failures >= this.threshold || isQuotaError) {
      console.warn(`[CircuitBreaker] Opening circuit for ${provider} (failures: ${failures}, quota: ${isQuotaError})`);
      this.openCircuits.add(provider);
    }
  }

  recordSuccess(provider: string): void {
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
}

// Global circuit breaker instance
const circuitBreaker = new CircuitBreaker();

/**
 * AI Provider Manager Class
 */
class AIProviderManager {
  private providers: Map<AIProvider, ProviderConfig> = new Map();
  private initialized = false;

  private async initialize() {
    if (this.initialized) return;

    // Try to validate environment (non-blocking)
    try {
      validateAIEnvironment();
    } catch (error) {
      console.warn('[ProviderManager] Environment validation warning:', error);
    }

    const priority = (
      process.env.AI_PROVIDER_PRIORITY || 'gemini,openai,anthropic'
    )
      .split(',')
      .map(p => p.trim());

    // Try to get API keys from admin settings first, then fall back to env vars
    let apiKeys: Record<string, string> = {};
    try {
      const { getAdminSettings } = await import('@/server/actions/admin-actions');
      const settings = await getAdminSettings();
      apiKeys = settings?.apiKeys || {};
    } catch (error) {
      console.log('[ProviderManager] Could not load admin settings, using env vars');
    }

    // OpenAI
    const openaiKey = apiKeys.openai || process.env.OPENAI_API_KEY;
    if (openaiKey) {
      this.providers.set('openai', {
        name: 'openai',
        enabled: true,
        apiKey: openaiKey,
        defaultModel: process.env.OPENAI_DEFAULT_MODEL || 'gpt-4o',
        fallbackModel: process.env.OPENAI_FALLBACK_MODEL || 'gpt-3.5-turbo',
        priority: priority.indexOf('openai') >= 0 ? priority.indexOf('openai') : 0,
        healthStatus: 'healthy',
        failureCount: 0,
      });
      console.log('✅ OpenAI provider initialized');
    }

    // Gemini
    const geminiKey = apiKeys.gemini || process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
    if (geminiKey) {
      this.providers.set('gemini', {
        name: 'gemini',
        enabled: true,
        apiKey: geminiKey,
        defaultModel: process.env.GEMINI_DEFAULT_MODEL || 'gemini-2.0-flash-exp',
        fallbackModel: process.env.GEMINI_FALLBACK_MODEL || 'gemini-1.5-flash',
        priority: priority.indexOf('gemini') >= 0 ? priority.indexOf('gemini') : 1,
        healthStatus: 'healthy',
        failureCount: 0,
      });
      console.log('✅ Gemini provider initialized');
    }

    // Anthropic/Claude
    const anthropicKey = apiKeys.claude || apiKeys.anthropic || process.env.ANTHROPIC_API_KEY;
    if (anthropicKey) {
      this.providers.set('anthropic', {
        name: 'anthropic',
        enabled: true,
        apiKey: anthropicKey,
        defaultModel: process.env.ANTHROPIC_DEFAULT_MODEL || 'claude-3-5-sonnet-20241022',
        fallbackModel: process.env.ANTHROPIC_FALLBACK_MODEL || 'claude-3-haiku-20240307',
        priority: priority.indexOf('anthropic') >= 0 ? priority.indexOf('anthropic') : 2,
        healthStatus: 'healthy',
        failureCount: 0,
      });
      console.log('✅ Anthropic provider initialized');
    }

    if (this.providers.size === 0) {
      console.error('❌ NO AI PROVIDERS CONFIGURED!');
      console.error('Please add at least one API key to your .env file or admin settings');
    } else {
      console.log(
        `✅ Initialized ${this.providers.size} AI provider(s):`,
        Array.from(this.providers.keys())
      );
    }

    this.initialized = true;
  }

  private getAvailableProviders(): ProviderConfig[] {
    return Array.from(this.providers.values())
      .filter(p => {
        if (!p.enabled || !p.apiKey) return false;
        if (p.healthStatus === 'down') return false;
        if (!circuitBreaker.shouldAttempt(p.name)) return false;
        return true;
      })
      .sort((a, b) => a.priority - b.priority);
  }

  private recordFailure(provider: AIProvider, error: any) {
    const config = this.providers.get(provider);
    if (!config) return;

    config.failureCount++;
    config.lastFailure = new Date();
    circuitBreaker.recordFailure(provider, error);

    const isQuotaError =
      error.status === 429 ||
      error.message?.includes('quota') ||
      error.message?.includes('insufficient_quota');

    if (config.failureCount >= 5 || isQuotaError) {
      config.healthStatus = 'down';
      console.error(`[ProviderManager] Provider ${provider} marked as DOWN`);

      // Auto-recover after timeout
      setTimeout(() => {
        config.healthStatus = 'healthy';
        config.failureCount = 0;
        console.log(`[ProviderManager] Provider ${provider} recovered`);
      }, parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT || '60000'));
    }
  }

  private recordSuccess(provider: AIProvider) {
    const config = this.providers.get(provider);
    if (config) {
      config.failureCount = 0;
      config.healthStatus = 'healthy';
      circuitBreaker.recordSuccess(provider);
    }
  }

  private async generateWithOpenAI(
    prompt: string,
    model: string,
    options: AIGenerateOptions
  ): Promise<AIResponse> {
    const config = this.providers.get('openai');
    if (!config?.apiKey) throw new Error('OpenAI API key not configured');

    const client = new OpenAI({ apiKey: config.apiKey });

    if (options.stream) {
      const stream = await client.chat.completions.create({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 2000,
        stream: true,
      });

      return {
        text: '',
        provider: 'openai',
        model,
        stream,
      };
    }

    const response = await client.chat.completions.create({
      model,
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
    model: string,
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
        text: '',
        provider: 'gemini',
        model,
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
    model: string,
    options: AIGenerateOptions
  ): Promise<AIResponse> {
    const config = this.providers.get('anthropic');
    if (!config?.apiKey) throw new Error('Anthropic API key not configured');

    const client = new Anthropic({ apiKey: config.apiKey });

    if (options.stream) {
      const stream = await client.messages.create({
        model,
        max_tokens: options.maxTokens || 2000,
        messages: [{ role: 'user', content: prompt }],
        stream: true,
      });

      return {
        text: '',
        provider: 'anthropic',
        model,
        stream,
      };
    }

    const response = await client.messages.create({
      model,
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

  /**
   * Generate text using the best available AI provider
   * Automatically falls back to other providers if one fails
   */
  async generate(prompt: string, options: AIGenerateOptions = {}): Promise<AIResponse> {
    await this.initialize();

    const availableProviders = this.getAvailableProviders();

    if (availableProviders.length === 0) {
      throw new Error(
        'No streaming provider available. Please configure an API key.\n' +
        'Add OPENAI_API_KEY, GOOGLE_AI_API_KEY, or ANTHROPIC_API_KEY to your .env file or admin settings.'
      );
    }

    const errors: Array<{ provider: string; error: any }> = [];

    for (const config of availableProviders) {
      // Skip if specific provider requested and this isn't it
      if (options.provider && config.name !== options.provider) continue;

      try {
        const model = options.model || config.defaultModel;
        console.log(`[ProviderManager] Attempting ${config.name} with model ${model}`);

        let response: AIResponse;

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
          default:
            throw new Error(`Unknown provider: ${config.name}`);
        }

        this.recordSuccess(config.name);
        console.log(`✅ Success with ${config.name} (${model})`);

        return response;

      } catch (error: any) {
        console.error(`❌ ${config.name} failed:`, error.message);
        this.recordFailure(config.name, error);
        errors.push({ provider: config.name, error });

        // Check if it's a quota error
        const isQuotaError =
          error.status === 429 ||
          error.message?.includes('quota') ||
          error.message?.includes('insufficient_quota');

        if (isQuotaError) {
          console.log(`[ProviderManager] Quota exceeded with ${config.name}, trying next provider...`);
          continue;
        }

        // If specific provider requested and it failed, throw
        if (options.provider) {
          throw error;
        }

        // Try fallback model for this provider
        if (config.fallbackModel && config.fallbackModel !== (options.model || config.defaultModel)) {
          try {
            console.log(`[ProviderManager] Trying fallback model ${config.fallbackModel} for ${config.name}`);

            let fallbackResponse: AIResponse;
            const fallbackOptions = { ...options, model: config.fallbackModel };

            switch (config.name) {
              case 'openai':
                fallbackResponse = await this.generateWithOpenAI(prompt, config.fallbackModel, fallbackOptions);
                break;
              case 'gemini':
                fallbackResponse = await this.generateWithGemini(prompt, config.fallbackModel, fallbackOptions);
                break;
              case 'anthropic':
                fallbackResponse = await this.generateWithAnthropic(prompt, config.fallbackModel, fallbackOptions);
                break;
              default:
                throw new Error(`Unknown provider: ${config.name}`);
            }

            this.recordSuccess(config.name);
            return fallbackResponse;
          } catch (fallbackError) {
            console.error(`[ProviderManager] Fallback model also failed for ${config.name}`);
          }
        }

        continue;
      }
    }

    // All providers failed
    const errorMessage = `All AI providers failed:\n${errors
      .map(e => `- ${e.provider}: ${e.error.message}`)
      .join('\n')}`;
    throw new Error(errorMessage);
  }

  /**
   * Get status of all providers
   */
  async getStatus() {
    await this.initialize();

    return Array.from(this.providers.entries()).map(([name, config]) => ({
      name,
      enabled: config.enabled,
      hasApiKey: !!config.apiKey,
      healthStatus: config.healthStatus,
      failureCount: config.failureCount,
      defaultModel: config.defaultModel,
      circuitBreaker: circuitBreaker.getStatus(name),
    }));
  }

  /**
   * Update provider model at runtime
   */
  updateProviderModel(provider: AIProvider, model: AIModel) {
    const config = this.providers.get(provider);
    if (config) {
      config.defaultModel = model;
      console.log(`[ProviderManager] Updated ${provider} default model to ${model}`);
    }
  }

  /**
   * Force re-initialization (useful after admin settings change)
   */
  async reinitialize() {
    this.initialized = false;
    this.providers.clear();
    await this.initialize();
  }
}

// Singleton instance
export const aiProviderManager = new AIProviderManager();

// Export for backward compatibility
export { AIProviderManager };