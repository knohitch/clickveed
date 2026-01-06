/**
 * @fileOverview Client implementations for AI providers that don't have Genkit plugins
 * This file contains direct API client implementations for various AI services
 */

import OpenAI from 'openai';
import axios from 'axios';

// Define types for our responses
interface TextGenerationResponse {
  text: string;
  model: string;
  provider: string;
}

interface ImageGenerationResponse {
  imageUrl: string;
  model: string;
  provider: string;
}

interface VideoGenerationResponse {
  videoUrl: string;
  model: string;
  provider: string;
}

interface TTSResponse {
  audioUrl: string;
  model: string;
  provider: string;
}

// Provider metadata for authentication type
interface ProviderMetadata {
  authType: 'apiKey' | 'oauth' | 'none';
  requiresSetup: boolean;
  setupInstructions?: string;
}

// Import database config service
import { getProviderMetadata as getDbProviderMetadata } from '@/lib/database-config-service';

// Helper function to check provider setup status (now uses database)
async function checkProviderSetup(provider: string): Promise<void> {
  const metadata = await getDbProviderMetadata(provider);
  if (metadata?.requiresSetup) {
    throw new Error(
      `[${provider}] Provider requires setup before use.\n` +
      `Authentication Type: ${metadata.authType}\n` +
      `Setup Instructions: ${metadata.setupInstructions}\n` +
      `This provider is intentionally disabled until proper credentials are configured.`
    );
  }
}

// OpenAI Client
export class OpenAIClient {
  private client: OpenAI;
  
  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }
  
  async generateText(messages: any[], model: string = 'gpt-4o'): Promise<TextGenerationResponse> {
    try {
      const response = await this.client.chat.completions.create({
        model,
        messages,
      });
      
      return {
        text: response.choices[0].message.content || '',
        model,
        provider: 'openai'
      };
    } catch (error) {
      console.error('OpenAI text generation error:', error);
      throw error;
    }
  }
  
  async generateTextStream(messages: any[], model: string = 'gpt-4o'): Promise<AsyncIterableIterator<TextGenerationResponse>> {
    try {
      const stream = await this.client.chat.completions.create({
        model,
        messages,
        stream: true,
      });
      
      async function* streamGenerator() {
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            yield {
              text: content,
              model,
              provider: 'openai'
            };
          }
        }
      }
      
      return streamGenerator();
    } catch (error) {
      console.error('OpenAI text streaming error:', error);
      throw error;
    }
  }
}

// Anthropic (Claude) Client
export class ClaudeClient {
  private apiKey: string;
  private baseUrl: string = 'https://api.anthropic.com/v1';
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  
  async generateText(messages: any[], model: string = 'claude-3-5-sonnet-20240620'): Promise<TextGenerationResponse> {
    try {
      // Convert messages to Claude format
      const systemMessage = messages.find(msg => msg.role === 'system');
      const conversationMessages = messages.filter(msg => msg.role !== 'system');
      
      const response = await axios.post(
        `${this.baseUrl}/messages`,
        {
          model,
          messages: conversationMessages,
          system: systemMessage ? systemMessage.content : undefined,
          max_tokens: 1024,
        },
        {
          headers: {
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
        }
      );
      
      return {
        text: response.data.content[0].text,
        model,
        provider: 'claude'
      };
    } catch (error) {
      console.error('Claude text generation error:', error);
      throw error;
    }
  }
}

// ElevenLabs TTS Client
export class ElevenLabsClient {
  private apiKey: string;
  private baseUrl: string = 'https://api.elevenlabs.io/v1';
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  
  async generateSpeech(text: string, voiceId: string = '21m00Tcm4TlvDq8ikWAM', model: string = 'eleven_monolingual_v1'): Promise<TTSResponse> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/text-to-speech/${voiceId}`,
        {
          text,
          model_id: model,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
          },
        },
        {
          headers: {
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
          responseType: 'arraybuffer',
        }
      );
      
      const audioBuffer = Buffer.from(response.data);
      const audioDataUri = `data:audio/mpeg;base64,${audioBuffer.toString('base64')}`;
      
      const { uploadToWasabi } = await import('@/server/services/wasabi-service');
      const { publicUrl } = await uploadToWasabi(audioDataUri, 'audio');
      
      return {
        audioUrl: publicUrl,
        model,
        provider: 'elevenlabs'
      };
    } catch (error) {
      console.error('ElevenLabs TTS error:', error);
      throw error;
    }
  }
}

// Imagen Client
export class ImagenClient {
  private apiKey: string;
  private baseUrl: string = 'https://us-central1-aiplatform.googleapis.com';
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  
  async generateImage(prompt: string, model: string = 'imagen-3.0'): Promise<ImageGenerationResponse> {
    try {
      // Using the correct Google Cloud Vertex AI endpoint for Imagen
      const response = await axios.post(
        `${this.baseUrl}/v1/projects/-/locations/us-central1/publishers/google/models/${model}:predict`,
        {
          instances: [{ prompt }],
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      // Extract the image URL from the response
      const imageUrl = response.data.predictions[0].bytesBase64Encoded;
      return {
        imageUrl: `data:image/png;base64,${imageUrl}`,
        model,
        provider: 'imagen'
      };
    } catch (error) {
      console.error('Imagen image generation error:', error);
      throw error;
    }
  }
}

// Google VEO Client
export class GoogleVeoClient {
  private apiKey: string;
  private baseUrl: string = 'https://us-central1-aiplatform.googleapis.com';
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  
  async generateVideo(prompt: string, model: string = 'veo-2.0'): Promise<VideoGenerationResponse> {
    try {
      // Using the Google Cloud Vertex AI endpoint for VEO
      const response = await axios.post(
        `${this.baseUrl}/v1/projects/-/locations/us-central1/publishers/google/models/${model}:predict`,
        {
          instances: [{ prompt }],
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      // Extract the video URL from the response
      // Note: This is a simplified implementation - actual response format may vary
      const videoUrl = response.data.predictions[0].videoUrl;
      return {
        videoUrl: videoUrl,
        model,
        provider: 'googleVeo'
      };
    } catch (error) {
      console.error('Google VEO video generation error:', error);
      throw error;
    }
  }
}

// Replicate Client
export class ReplicateClient {
  private apiKey: string;
  private baseUrl: string = 'https://api.replicate.com/v1';
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  
  async generateImage(prompt: string, model: string = 'stability-ai/sdxl'): Promise<ImageGenerationResponse> {
    try {
      const modelVersions: Record<string, string> = {
        'stability-ai/sdxl': '39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
      };

      const version = modelVersions[model] || model;

      const createResponse = await axios.post(
        `${this.baseUrl}/predictions`,
        {
          version,
          input: { prompt },
        },
        {
          headers: {
            'Authorization': `Token ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const predictionId = createResponse.data.id;
      
      let result = createResponse.data;
      while (result.status !== 'succeeded' && result.status !== 'failed' && result.status !== 'canceled') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const pollResponse = await axios.get(
          `${this.baseUrl}/predictions/${predictionId}`,
          {
            headers: {
              'Authorization': `Token ${this.apiKey}`,
            },
          }
        );
        result = pollResponse.data;
      }

      if (result.status !== 'succeeded' || !result.output?.[0]) {
        throw new Error(`Replicate generation failed: ${result.status}`);
      }

      const imageUrl = result.output[0];
      
      const { uploadToWasabi } = await import('@/server/services/wasabi-service');
      const imageResponse = await fetch(imageUrl);
      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
      const imageDataUri = `data:image/png;base64,${imageBuffer.toString('base64')}`;
      const { publicUrl } = await uploadToWasabi(imageDataUri, 'images');
      
      return {
        imageUrl: publicUrl,
        model,
        provider: 'replicate'
      };
    } catch (error) {
      console.error('Replicate image generation error:', error);
      throw error;
    }
  }
}

// Seedance Client
export class SeedanceClient {
  private apiKey: string;
  private baseUrl: string = 'https://api.seedance.ai';
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  
  async generateVideo(prompt: string, style: string = 'default'): Promise<VideoGenerationResponse> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/v1/video.generate`,
        {
          prompt,
          style,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const videoUrl = response.data?.video_url || response.data?.videoUrl;

      if (!videoUrl) {
        throw new Error('No video URL returned from Seedance API');
      }

      const { uploadToWasabi } = await import('@/server/services/wasabi-service');
      const videoResponse = await fetch(videoUrl);
      const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
      const videoDataUri = `data:video/mp4;base64,${videoBuffer.toString('base64')}`;
      const { publicUrl } = await uploadToWasabi(videoDataUri, 'video');

      return {
        videoUrl: publicUrl,
        model: 'seedance-video',
        provider: 'seedance'
      };
    } catch (error) {
      console.error('Seedance video generation error:', error);
      throw error;
    }
  }
}

// HeyGen Client
export class HeyGenClient {
  private apiKey: string;
  private baseUrl: string = 'https://api.heygen.com';
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  
  async generateVideo(prompt: string, avatar: string = 'default'): Promise<VideoGenerationResponse> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/v1/video.generate`,
        {
          avatar,
          text: prompt,
        },
        {
          headers: {
            'X-Api-Key': this.apiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      const videoUrl = response.data?.data?.video_url || response.data?.videoUrl;

      if (!videoUrl) {
        throw new Error('No video URL returned from HeyGen API');
      }

      const { uploadToWasabi } = await import('@/server/services/wasabi-service');
      const videoResponse = await fetch(videoUrl);
      const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
      const videoDataUri = `data:video/mp4;base64,${videoBuffer.toString('base64')}`;
      const { publicUrl } = await uploadToWasabi(videoDataUri, 'video');

      return {
        videoUrl: publicUrl,
        model: 'heygen-video',
        provider: 'heygen'
      };
    } catch (error) {
      console.error('HeyGen video generation error:', error);
      throw error;
    }
  }
}

// Wan Client
export class WanClient {
  private apiKey: string;
  private baseUrl: string = 'https://api.wan.ai';
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  
  async generateVideo(prompt: string, style: string = 'default'): Promise<VideoGenerationResponse> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/v1/video.generate`,
        {
          prompt,
          style,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const videoUrl = response.data?.data?.video_url || response.data?.videoUrl;

      if (!videoUrl) {
        throw new Error('No video URL returned from Wan API');
      }

      const { uploadToWasabi } = await import('@/server/services/wasabi-service');
      const videoResponse = await fetch(videoUrl);
      const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
      const videoDataUri = `data:video/mp4;base64,${videoBuffer.toString('base64')}`;
      const { publicUrl } = await uploadToWasabi(videoDataUri, 'video');

      return {
        videoUrl: publicUrl,
        model: 'wan-video',
        provider: 'wan'
      };
    } catch (error) {
      console.error('Wan video generation error:', error);
      throw error;
    }
  }
}

// Hugging Face Client
export class HuggingFaceClient {
  private apiKey: string;
  private baseUrl: string = 'https://api-inference.huggingface.co';
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  
  async generateText(prompt: string, model: string = 'gpt2'): Promise<TextGenerationResponse> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/models/${model}`,
        { inputs: prompt },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
          },
        }
      );
      
      return {
        text: response.data[0].generated_text,
        model,
        provider: 'huggingface'
      };
    } catch (error) {
      console.error('Hugging Face text generation error:', error);
      throw error;
    }
  }
}

// Factory function to create clients based on provider
export async function createProviderClient(provider: string): Promise<any> {
  // Check setup status before creating any client (now uses database)
  const metadata = await checkProviderSetup(provider);
  
  // Fetch API key from database
  const { getAdminSettings } = await import('@/server/actions/admin-actions');
  const settings = await getAdminSettings();
  const apiKey = settings?.apiKeys?.[provider] || '';

  if (!apiKey && metadata.authType === 'apiKey') {
    throw new Error(
      `[${provider}] API key not configured. Please add the API key in admin settings.`
    );
  }
  
  switch (provider) {
    case 'openai':
    case 'azureOpenai':
      return new OpenAIClient(apiKey);
    case 'claude':
      return new ClaudeClient(apiKey);
    case 'elevenlabs':
      return new ElevenLabsClient(apiKey);
    case 'replicate':
      return new ReplicateClient(apiKey);
    case 'huggingface':
      return new HuggingFaceClient(apiKey);
    case 'imagen':
      return new ImagenClient(apiKey);
    case 'googleVeo':
      return new GoogleVeoClient(apiKey);
    case 'heygen':
      return new HeyGenClient(apiKey);
    case 'seedance':
      return new SeedanceClient(apiKey);
    case 'wan':
      return new WanClient(apiKey);
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

// Export helper to get provider metadata (now wraps database call)
export async function getProviderMetadata(provider: string): Promise<ProviderMetadata> {
  return getDbProviderMetadata(provider);
}
