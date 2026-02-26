/**
 * Single source of truth for AI providers, capabilities, priorities, and model ids.
 * Keep this file in sync with provider client implementations.
 */

export type AICapability = 'text' | 'text_stream' | 'image' | 'image_edit' | 'video' | 'tts';

export type ProviderName =
  | 'gemini'
  | 'openai'
  | 'azureOpenai'
  | 'claude'
  | 'deepseek'
  | 'grok'
  | 'qwen'
  | 'perplexity'
  | 'openrouter'
  | 'huggingface'
  | 'imagen'
  | 'stableDiffusion'
  | 'replicate'
  | 'dreamstudio'
  | 'midjourney'
  | 'modelslab'
  | 'googleVeo'
  | 'seedance'
  | 'kling'
  | 'heygen'
  | 'wan'
  | 'modelscope'
  | 'stableVideo'
  | 'animateDiff'
  | 'videoFusion'
  | 'minimax'
  | 'elevenlabs'
  | 'azureTts'
  | 'myshell'
  | 'coqui';

export interface ProviderDefinition {
  name: ProviderName;
  capability: AICapability;
  priority: number;
  model: string;
  implemented: boolean;
}

function resolveModel(envValue: string | undefined, fallback: string): string {
  const value = envValue?.trim();
  return value && value.length > 0 ? value : fallback;
}

export const MODEL_CONSTANTS = {
  // Use model aliases / env overrides so model upgrades do not require code changes.
  GEMINI_TEXT_MODEL: resolveModel(process.env.GEMINI_TEXT_MODEL, 'googleai/gemini-flash-latest'),
  GEMINI_IMAGE_MODEL: resolveModel(process.env.GEMINI_IMAGE_MODEL, 'googleai/gemini-2.5-flash-image'),
  IMAGEN_IMAGE_MODEL: resolveModel(process.env.IMAGEN_IMAGE_MODEL, 'googleai/imagen-4.0-generate-001'),
  GEMINI_VIDEO_MODEL: resolveModel(process.env.GEMINI_VIDEO_MODEL, 'googleai/veo-3.0-generate-001'),
  CLAUDE_TEXT_MODEL: 'anthropic/claude-3-5-sonnet',
} as const;

const defs: ProviderDefinition[] = [
  // Text
  { name: 'gemini', capability: 'text', priority: 1, model: MODEL_CONSTANTS.GEMINI_TEXT_MODEL, implemented: true },
  { name: 'openai', capability: 'text', priority: 2, model: 'openai/gpt-4o', implemented: true },
  { name: 'azureOpenai', capability: 'text', priority: 3, model: 'openai/gpt-4o', implemented: true },
  { name: 'claude', capability: 'text', priority: 4, model: MODEL_CONSTANTS.CLAUDE_TEXT_MODEL, implemented: true },
  { name: 'deepseek', capability: 'text', priority: 5, model: 'openai/gpt-4o', implemented: false },
  { name: 'grok', capability: 'text', priority: 6, model: 'openai/gpt-4o', implemented: false },
  { name: 'qwen', capability: 'text', priority: 7, model: 'openai/gpt-4o', implemented: false },
  { name: 'perplexity', capability: 'text', priority: 8, model: 'openai/gpt-4o', implemented: false },
  { name: 'openrouter', capability: 'text', priority: 9, model: 'openai/gpt-4o', implemented: false },
  { name: 'huggingface', capability: 'text', priority: 10, model: 'openai/gpt-4o', implemented: true },

  // Streaming text (same order, must support stream method)
  { name: 'gemini', capability: 'text_stream', priority: 1, model: MODEL_CONSTANTS.GEMINI_TEXT_MODEL, implemented: true },
  { name: 'openai', capability: 'text_stream', priority: 2, model: 'openai/gpt-4o', implemented: true },
  { name: 'azureOpenai', capability: 'text_stream', priority: 3, model: 'openai/gpt-4o', implemented: true },
  { name: 'claude', capability: 'text_stream', priority: 4, model: MODEL_CONSTANTS.CLAUDE_TEXT_MODEL, implemented: false },

  // Image
  { name: 'imagen', capability: 'image', priority: 1, model: MODEL_CONSTANTS.IMAGEN_IMAGE_MODEL, implemented: true },
  { name: 'stableDiffusion', capability: 'image', priority: 2, model: 'openai/gpt-4o', implemented: false },
  { name: 'replicate', capability: 'image', priority: 3, model: 'openai/gpt-4o', implemented: true },
  { name: 'gemini', capability: 'image', priority: 4, model: MODEL_CONSTANTS.GEMINI_IMAGE_MODEL, implemented: true },
  { name: 'dreamstudio', capability: 'image', priority: 5, model: 'openai/gpt-4o', implemented: false },
  { name: 'midjourney', capability: 'image', priority: 6, model: 'openai/gpt-4o', implemented: false },
  { name: 'modelslab', capability: 'image', priority: 7, model: 'openai/gpt-4o', implemented: false },

  // Image editing (background removal, masking). Gemini is the supported editor.
  { name: 'gemini', capability: 'image_edit', priority: 1, model: MODEL_CONSTANTS.GEMINI_IMAGE_MODEL, implemented: true },

  // Video
  { name: 'googleVeo', capability: 'video', priority: 1, model: MODEL_CONSTANTS.GEMINI_VIDEO_MODEL, implemented: true },
  { name: 'seedance', capability: 'video', priority: 2, model: 'openai/gpt-4o', implemented: true },
  { name: 'kling', capability: 'video', priority: 3, model: 'openai/gpt-4o', implemented: false },
  { name: 'heygen', capability: 'video', priority: 4, model: 'openai/gpt-4o', implemented: true },
  { name: 'wan', capability: 'video', priority: 5, model: 'openai/gpt-4o', implemented: true },
  { name: 'modelscope', capability: 'video', priority: 6, model: 'openai/gpt-4o', implemented: false },
  { name: 'stableVideo', capability: 'video', priority: 7, model: 'openai/gpt-4o', implemented: false },
  { name: 'animateDiff', capability: 'video', priority: 8, model: 'openai/gpt-4o', implemented: false },
  { name: 'videoFusion', capability: 'video', priority: 9, model: 'openai/gpt-4o', implemented: false },

  // TTS
  { name: 'minimax', capability: 'tts', priority: 1, model: 'minimax', implemented: true },
  { name: 'elevenlabs', capability: 'tts', priority: 2, model: 'elevenlabs', implemented: true },
  { name: 'gemini', capability: 'tts', priority: 3, model: MODEL_CONSTANTS.GEMINI_TEXT_MODEL, implemented: true },
  { name: 'azureTts', capability: 'tts', priority: 4, model: 'openai/gpt-4o', implemented: false },
  { name: 'myshell', capability: 'tts', priority: 5, model: 'openai/gpt-4o', implemented: false },
  { name: 'coqui', capability: 'tts', priority: 6, model: 'openai/gpt-4o', implemented: false },
];

export const PROVIDER_REGISTRY = defs;

export function getProvidersForCapability(capability: AICapability): ProviderDefinition[] {
  return PROVIDER_REGISTRY
    .filter((d) => d.capability === capability)
    .sort((a, b) => a.priority - b.priority);
}

export function getUnsupportedConfiguredProviders(apiKeys: Record<string, string>): ProviderName[] {
  const configured = Object.entries(apiKeys)
    .filter(([_, value]) => !!value)
    .map(([name]) => name as ProviderName);

  const definedNames = new Set(PROVIDER_REGISTRY.map((d) => d.name));
  const unsupported = new Set<ProviderName>();

  for (const name of configured) {
    if (!definedNames.has(name)) continue;
    const implementedForAnyCapability = PROVIDER_REGISTRY.some((d) => d.name === name && d.implemented);
    if (!implementedForAnyCapability) {
      unsupported.add(name);
    }
  }

  return Array.from(unsupported.values());
}
