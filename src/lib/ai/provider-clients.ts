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
import { getProviderMetadata } from '@/lib/database-config-service';

// Helper function to check provider setup status (now uses database)
async function checkProviderSetup(provider: string): Promise<ProviderMetadata> {
  const metadata = await getProviderMetadata(provider);
  if (metadata?.requiresSetup) {
    throw new Error(
      `[${provider}] Provider requires setup before use.\n` +
      `Authentication Type: ${metadata.authType}\n` +
      `Setup Instructions: ${metadata.setupInstructions}\n` +
      `This provider is intentionally disabled until proper credentials are configured.`
    );
  }
  return metadata;
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
        text: response.choices[0]?.message?.content || '',
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

// Gemini (Google AI) Client
export class GeminiClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateText(messages: any[], model: string = 'gemini-2.0-flash'): Promise<TextGenerationResponse> {
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(this.apiKey);

      // Extract system message if present
      const systemMessage = messages.find((msg: any) => msg.role === 'system');
      const conversationMessages = messages.filter((msg: any) => msg.role !== 'system');

      const geminiModel = genAI.getGenerativeModel({
        model,
        ...(systemMessage ? { systemInstruction: systemMessage.content?.[0]?.text || systemMessage.content } : {}),
      });

      // Build prompt from messages
      const prompt = conversationMessages
        .map((msg: any) => {
          const text = msg.content?.[0]?.text || msg.content;
          return typeof text === 'string' ? text : JSON.stringify(text);
        })
        .join('\n');

      const result = await geminiModel.generateContent(prompt);
      const response = await result.response;

      return {
        text: response.text(),
        model,
        provider: 'gemini',
      };
    } catch (error) {
      console.error('Gemini text generation error:', error);
      throw error;
    }
  }

  async generateTextStream(messages: any[], model: string = 'gemini-2.0-flash'): Promise<AsyncIterableIterator<TextGenerationResponse>> {
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(this.apiKey);

      // Extract system message if present
      const systemMessage = messages.find((msg: any) => msg.role === 'system');
      const conversationMessages = messages.filter((msg: any) => msg.role !== 'system');

      const geminiModel = genAI.getGenerativeModel({
        model,
        ...(systemMessage ? { systemInstruction: systemMessage.content?.[0]?.text || systemMessage.content } : {}),
      });

      // Build prompt from messages
      const prompt = conversationMessages
        .map((msg: any) => {
          const text = msg.content?.[0]?.text || msg.content;
          return typeof text === 'string' ? text : JSON.stringify(text);
        })
        .join('\n');

      const result = await geminiModel.generateContentStream(prompt);

      async function* streamGenerator() {
        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) {
            yield {
              text,
              model,
              provider: 'gemini',
            };
          }
        }
      }

      return streamGenerator();
    } catch (error) {
      console.error('Gemini text streaming error:', error);
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

// Imagen Client - FIXED for proper Google Cloud integration
export class ImagenClient {
  private accessToken: string;
  private projectId: string;
  private baseUrl: string = 'https://us-central1-aiplatform.googleapis.com';

  constructor(apiKey: string) {
    // apiKey is actually the OAuth access token for Google Cloud
    this.accessToken = apiKey;
    // Get project ID from environment variable
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || '';

    if (!this.projectId) {
      console.warn('[Imagen] GOOGLE_CLOUD_PROJECT_ID not set. Image generation may fail.');
    }
  }

  async generateImage(prompt: string, model: string = 'imagegeneration@006'): Promise<ImageGenerationResponse> {
    try {
      if (!this.projectId) {
        throw new Error('GOOGLE_CLOUD_PROJECT_ID environment variable not set');
      }

      // Using the correct Google Cloud Vertex AI endpoint with actual project ID
      const endpoint = `${this.baseUrl}/v1/projects/${this.projectId}/locations/us-central1/publishers/google/models/${model}:predict`;

      const response = await axios.post(
        endpoint,
        {
          instances: [{
            prompt: prompt
          }],
          parameters: {
            sampleCount: 1,
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 60000, // 60 second timeout
        }
      );

      // Extract the base64 image from the response
      const prediction = response.data.predictions[0];
      const imageBase64 = prediction.bytesBase64Encoded;

      if (!imageBase64) {
        throw new Error('No image data returned from Imagen API');
      }

      // Upload to Wasabi for permanent storage
      const { uploadToWasabi } = await import('@/server/services/wasabi-service');
      const imageDataUri = `data:image/png;base64,${imageBase64}`;
      const { publicUrl } = await uploadToWasabi(imageDataUri, 'images');

      return {
        imageUrl: publicUrl,
        model,
        provider: 'imagen'
      };
    } catch (error) {
      console.error('[Imagen] Image generation error:', error);
      if (axios.isAxiosError(error) && error.response) {
        console.error('[Imagen] API Response:', error.response.data);
        throw new Error(`Imagen API error (${error.response.status}): ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }
}

// Google VEO Client - FIXED for proper Google Cloud integration with job polling
export class GoogleVeoClient {
  private accessToken: string;
  private projectId: string;
  private baseUrl: string = 'https://us-central1-aiplatform.googleapis.com';

  constructor(apiKey: string) {
    // apiKey is actually the OAuth access token for Google Cloud
    this.accessToken = apiKey;
    // Get project ID from environment variable
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || '';

    if (!this.projectId) {
      console.warn('[GoogleVeo] GOOGLE_CLOUD_PROJECT_ID not set. Video generation may fail.');
    }
  }

  async generateVideo(prompt: string, model: string = 'imagen-video-001'): Promise<VideoGenerationResponse> {
    try {
      if (!this.projectId) {
        throw new Error('GOOGLE_CLOUD_PROJECT_ID environment variable not set');
      }

      // Using the correct Google Cloud Vertex AI endpoint with actual project ID
      // Video generation is async, so we use predictLongRunning
      const endpoint = `${this.baseUrl}/v1/projects/${this.projectId}/locations/us-central1/publishers/google/models/${model}:predictLongRunning`;

      const startResponse = await axios.post(
        endpoint,
        {
          instances: [{
            prompt: prompt
          }],
          parameters: {
            sampleCount: 1,
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 60000, // 60 second timeout for initial request
        }
      );

      // Get the operation name for polling
      const operationName = startResponse.data.name;

      if (!operationName) {
        throw new Error('No operation name returned from Google Veo API');
      }

      // Poll for completion (video generation takes time)
      let result;
      const maxAttempts = 120; // 10 minutes max (5 sec intervals)

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

        const statusResponse = await axios.get(
          `${this.baseUrl}/v1/${operationName}`,
          {
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
            },
            timeout: 30000,
          }
        );

        if (statusResponse.data.done) {
          result = statusResponse.data.response;
          break;
        }

        if (statusResponse.data.error) {
          throw new Error(`Video generation failed: ${JSON.stringify(statusResponse.data.error)}`);
        }

        console.log(`[GoogleVeo] Polling attempt ${attempt + 1}/${maxAttempts}...`);
      }

      if (!result) {
        throw new Error('Video generation timed out after 10 minutes');
      }

      // Extract the video from the response
      const prediction = result.predictions?.[0];
      const videoBase64 = prediction?.bytesBase64Encoded;

      if (!videoBase64) {
        throw new Error('No video data returned from Google Veo API');
      }

      // Upload to Wasabi for permanent storage
      const { uploadToWasabi } = await import('@/server/services/wasabi-service');
      const videoDataUri = `data:video/mp4;base64,${videoBase64}`;
      const { publicUrl } = await uploadToWasabi(videoDataUri, 'videos');

      return {
        videoUrl: publicUrl,
        model,
        provider: 'googleVeo'
      };
    } catch (error) {
      console.error('[GoogleVeo] Video generation error:', error);
      if (axios.isAxiosError(error) && error.response) {
        console.error('[GoogleVeo] API Response:', error.response.data);
        throw new Error(`Google Veo API error (${error.response.status}): ${JSON.stringify(error.response.data)}`);
      }
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

// Seedance Client - FIXED with proper job polling
export class SeedanceClient {
  private apiKey: string;
  private baseUrl: string = 'https://api.seedance.ai';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateVideo(prompt: string, style: string = 'default'): Promise<VideoGenerationResponse> {
    try {
      // Start video generation
      const startResponse = await axios.post(
        `${this.baseUrl}/v1/video/generate`,
        {
          prompt,
          style,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000, // 30 second timeout for initial request
        }
      );

      const jobId = startResponse.data?.job_id || startResponse.data?.id;

      if (!jobId) {
        // If no job ID, maybe it's synchronous
        const videoUrl = startResponse.data?.video_url || startResponse.data?.videoUrl;
        if (videoUrl) {
          const { uploadToWasabi } = await import('@/server/services/wasabi-service');
          const videoResponse = await fetch(videoUrl);
          const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
          const videoDataUri = `data:video/mp4;base64,${videoBuffer.toString('base64')}`;
          const { publicUrl } = await uploadToWasabi(videoDataUri, 'videos');

          return { videoUrl: publicUrl, model: 'seedance-video', provider: 'seedance' };
        }
        throw new Error('No job ID or video URL returned from Seedance API');
      }

      // Poll for completion
      let result;
      const maxAttempts = 60; // 5 minutes max (5 sec intervals)

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

        const statusResponse = await axios.get(
          `${this.baseUrl}/v1/video/status/${jobId}`,
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
            },
            timeout: 30000,
          }
        );

        const status = statusResponse.data?.status;

        if (status === 'completed' || status === 'succeeded') {
          result = statusResponse.data;
          break;
        }

        if (status === 'failed' || status === 'error') {
          throw new Error(`Video generation failed: ${statusResponse.data?.error || 'Unknown error'}`);
        }

        console.log(`[Seedance] Polling attempt ${attempt + 1}/${maxAttempts}, status: ${status}`);
      }

      if (!result) {
        throw new Error('Video generation timed out after 5 minutes');
      }

      const videoUrl = result?.video_url || result?.videoUrl || result?.url;

      if (!videoUrl) {
        throw new Error('No video URL in completed job response');
      }

      const { uploadToWasabi } = await import('@/server/services/wasabi-service');
      const videoResponse = await fetch(videoUrl);
      const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
      const videoDataUri = `data:video/mp4;base64,${videoBuffer.toString('base64')}`;
      const { publicUrl } = await uploadToWasabi(videoDataUri, 'videos');

      return {
        videoUrl: publicUrl,
        model: 'seedance-video',
        provider: 'seedance'
      };
    } catch (error) {
      console.error('[Seedance] Video generation error:', error);
      if (axios.isAxiosError(error) && error.response) {
        console.error('[Seedance] API Response:', error.response.data);
      }
      throw error;
    }
  }
}

// HeyGen Client - FIXED with proper job polling
export class HeyGenClient {
  private apiKey: string;
  private baseUrl: string = 'https://api.heygen.com';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateVideo(prompt: string, avatar: string = 'default'): Promise<VideoGenerationResponse> {
    try {
      // Start video generation
      const startResponse = await axios.post(
        `${this.baseUrl}/v1/video.generate`,
        {
          avatar_id: avatar,
          script: {
            type: 'text',
            input_text: prompt,
          },
        },
        {
          headers: {
            'X-Api-Key': this.apiKey,
            'Content-Type': 'application/json',
          },
          timeout: 30000, // 30 second timeout
        }
      );

      const videoId = startResponse.data?.data?.video_id || startResponse.data?.video_id;

      if (!videoId) {
        throw new Error('No video ID returned from HeyGen API');
      }

      // Poll for completion
      let result;
      const maxAttempts = 120; // 10 minutes max (5 sec intervals)

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

        const statusResponse = await axios.get(
          `${this.baseUrl}/v1/video_status.get?video_id=${videoId}`,
          {
            headers: {
              'X-Api-Key': this.apiKey,
            },
            timeout: 30000,
          }
        );

        const status = statusResponse.data?.data?.status;

        if (status === 'completed') {
          result = statusResponse.data.data;
          break;
        }

        if (status === 'failed') {
          throw new Error(`Video generation failed: ${statusResponse.data?.data?.error || 'Unknown error'}`);
        }

        console.log(`[HeyGen] Polling attempt ${attempt + 1}/${maxAttempts}, status: ${status}`);
      }

      if (!result) {
        throw new Error('Video generation timed out after 10 minutes');
      }

      const videoUrl = result?.video_url || result?.url;

      if (!videoUrl) {
        throw new Error('No video URL in completed response');
      }

      const { uploadToWasabi } = await import('@/server/services/wasabi-service');
      const videoResponse = await fetch(videoUrl);
      const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
      const videoDataUri = `data:video/mp4;base64,${videoBuffer.toString('base64')}`;
      const { publicUrl } = await uploadToWasabi(videoDataUri, 'videos');

      return {
        videoUrl: publicUrl,
        model: 'heygen-video',
        provider: 'heygen'
      };
    } catch (error) {
      console.error('[HeyGen] Video generation error:', error);
      if (axios.isAxiosError(error) && error.response) {
        console.error('[HeyGen] API Response:', error.response.data);
      }
      throw error;
    }
  }
}

// Wan Client - FIXED with proper job polling
export class WanClient {
  private apiKey: string;
  private baseUrl: string = 'https://api.wan.ai';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateVideo(prompt: string, style: string = 'default'): Promise<VideoGenerationResponse> {
    try {
      // Start video generation
      const startResponse = await axios.post(
        `${this.baseUrl}/v1/video/generate`,
        {
          prompt,
          style,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000, // 30 second timeout
        }
      );

      const taskId = startResponse.data?.task_id || startResponse.data?.id;

      if (!taskId) {
        // If no task ID, maybe it's synchronous
        const videoUrl = startResponse.data?.video_url || startResponse.data?.videoUrl;
        if (videoUrl) {
          const { uploadToWasabi } = await import('@/server/services/wasabi-service');
          const videoResponse = await fetch(videoUrl);
          const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
          const videoDataUri = `data:video/mp4;base64,${videoBuffer.toString('base64')}`;
          const { publicUrl } = await uploadToWasabi(videoDataUri, 'videos');

          return { videoUrl: publicUrl, model: 'wan-video', provider: 'wan' };
        }
        throw new Error('No task ID or video URL returned from Wan API');
      }

      // Poll for completion
      let result;
      const maxAttempts = 60; // 5 minutes max (5 sec intervals)

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

        const statusResponse = await axios.get(
          `${this.baseUrl}/v1/video/task/${taskId}`,
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
            },
            timeout: 30000,
          }
        );

        const status = statusResponse.data?.status;

        if (status === 'completed' || status === 'success') {
          result = statusResponse.data;
          break;
        }

        if (status === 'failed' || status === 'error') {
          throw new Error(`Video generation failed: ${statusResponse.data?.error || 'Unknown error'}`);
        }

        console.log(`[Wan] Polling attempt ${attempt + 1}/${maxAttempts}, status: ${status}`);
      }

      if (!result) {
        throw new Error('Video generation timed out after 5 minutes');
      }

      const videoUrl = result?.video_url || result?.videoUrl || result?.url;

      if (!videoUrl) {
        throw new Error('No video URL in completed task response');
      }

      const { uploadToWasabi } = await import('@/server/services/wasabi-service');
      const videoResponse = await fetch(videoUrl);
      const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
      const videoDataUri = `data:video/mp4;base64,${videoBuffer.toString('base64')}`;
      const { publicUrl } = await uploadToWasabi(videoDataUri, 'videos');

      return {
        videoUrl: publicUrl,
        model: 'wan-video',
        provider: 'wan'
      };
    } catch (error) {
      console.error('[Wan] Video generation error:', error);
      if (axios.isAxiosError(error) && error.response) {
        console.error('[Wan] API Response:', error.response.data);
      }
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
    case 'gemini':
      return new GeminiClient(apiKey);
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