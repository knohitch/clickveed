# AI API Implementation Plan

## Overview
This document outlines the implementation plan for adding support for missing AI APIs in the ClickVid Pro application. The goal is to integrate all the listed APIs while maintaining the existing architecture and ensuring proper configuration through the admin panel.

## Current State Analysis
- API keys are managed through the admin settings context
- The `initialApiKeysObject` in `src/contexts/admin-settings-context.tsx` already includes many of the required API keys
- The `api-service-manager.ts` handles provider selection based on configured API keys
- Genkit is used as the primary AI framework with custom OpenAI integration

## API Keys Status Check

Looking at the `initialApiKeysObject` in `src/contexts/admin-settings-context.tsx`, I can see that most API keys are already defined:

### Video Generation
- [x] Google VEO (googleVeo)
- [x] HeyGen (heygen)
- [x] Kling AI (kling)
- [x] ModelScope T2V (modelscope)
- [x] Stable Video Diffusion (stableVideo)
- [x] AnimateDiff (animateDiff)
- [x] VideoFusion API (videoFusion)

### Image Generation
- [x] Stable Diffusion (stableDiffusion)
- [x] Midjourney (midjourney)
- [x] Imagen 4 (imagen)
- [x] DreamStudio API (dreamstudio)
- [x] Replicate API (replicate)
- [x] ModelsLab AI (modelslab)

### Audio (TTS, Voice, STT)
- [x] Eleven Labs (elevenlabs)
- [x] Azure Text-to-Speech (azureTts)
- [x] MyShell OpenVoice API (myshell)
- [x] Coqui TTS (coqui)
- [x] Coqui API (coqui)
- [x] AssemblyAI (assemblyai)
- [x] Deepgram AI (deepgram)

### LLMs (Text AI only)
- [x] OpenAI (openai)
- [x] Azure OpenAI (azureOpenai)
- [x] Claude AI (claude)
- [x] Gemini (gemini)
- [x] DeepSeek (deepseek)
- [x] GrokAI (grok)
- [x] QWenAI (qwen)
- [x] Perplexity AI (perplexity)
- [x] OpenRouter API (openrouter)
- [x] Hugging Face Spaces (huggingface)

## Implementation Progress
Significant progress has been made in implementing the AI API integrations:

1. ✅ Updated provider priority lists in `api-service-manager.ts` to include all available providers
2. ✅ Created custom client implementations for major providers in `provider-clients.ts`
3. ✅ Updated the service manager to support new providers with proper fallback mechanisms

## Implementation Approach

### 1. Extend Provider Priority Lists
- [x] Add all LLM providers to `llmProviderPriority`
- [x] Add all image generation providers to `imageProviderPriority`
- [x] Add all video generation providers to `videoProviderPriority`
- [x] Add all TTS providers to `ttsProviderPriority`

### 2. Implement Provider Integration
- [x] Create integration functions for LLM providers (OpenAI, Claude, HuggingFace)
- [x] Create integration functions for image generation providers (Replicate, Stable Diffusion, Midjourney)
- [x] Create integration functions for video generation providers (HeyGen, Kling, ModelScope)
- [x] Create integration functions for TTS/STT providers (ElevenLabs, Azure TTS, MyShell)
- [x] Handle authentication and API key management for each provider
- [x] Implement proper error handling and fallback mechanisms

### 3. Update Service Manager
- [x] Modify `api-service-manager.ts` to support new providers
- [x] Add provider selection logic based on API key availability
- [x] Ensure graceful degradation when providers are not configured

### 4. Testing and Validation
- [ ] Test each new API integration
- [ ] Verify fallback mechanisms work correctly
- [ ] Validate admin configuration UI

## Implementation Steps

### Phase 1: API Key Management and Configuration
1. Update `initialApiKeysObject` with any missing API keys
2. Verify all existing API keys are properly typed
3. Update admin settings UI to include configuration for new APIs

### Phase 2: Provider Integration
1. Implement integration for each category of APIs (LLMs, Image, Video, Audio)
2. Create provider-specific client functions
3. Implement proper error handling

### Phase 3: Service Manager Updates
1. Extend provider priority lists with new providers
2. Update selection logic to include new providers
3. Ensure backward compatibility

### Phase 4: Testing and Validation
1. Test each new API integration
2. Verify proper fallback behavior
3. Validate admin configuration

## Files to Modify
1. `src/contexts/admin-settings-context.tsx` - API key definitions
2. `src/lib/ai/api-service-manager.ts` - Provider selection and integration
3. `src/ai/genkit.ts` - Genkit instance configuration
4. Admin settings UI components (to be identified)

## Success Criteria
- All listed APIs are integrated and functional
- Proper fallback mechanisms are in place
- Admin configuration is intuitive and comprehensive
- No breaking changes to existing functionality
