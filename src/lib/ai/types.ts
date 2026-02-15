/**
 * AI Provider Types
 * Type-safe definitions for AI providers and models
 */

export type AIProvider = 'openai' | 'gemini' | 'anthropic' | 'claude';

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
  | 'claude-3-haiku-20240307'
  | 'claude-3-5-sonnet-20240620';

export type AIModel = OpenAIModel | GeminiModel | AnthropicModel | string;

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
  provider: AIProvider | string;
  model: AIModel;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  stream?: any;
}

export interface TextGenerationResponse {
  text: string;
  model: string;
  provider: string;
}

export interface ImageGenerationResponse {
  imageUrl: string;
  model: string;
  provider: string;
}

export interface VideoGenerationResponse {
  videoUrl: string;
  model: string;
  provider: string;
}

export interface TTSResponse {
  audioUrl: string;
  model: string;
  provider: string;
}

// Provider metadata for authentication type
export interface ProviderMetadata {
  authType: 'apiKey' | 'oauth' | 'none';
  requiresSetup: boolean;
  setupInstructions?: string;
}
