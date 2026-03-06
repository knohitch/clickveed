/**
 * @fileOverview Client implementations for AI providers that don't have Genkit plugins
 * This file contains direct API client implementations for various AI services
 */

import OpenAI from 'openai';
import axios from 'axios';
import AWS from 'aws-sdk';

import { generateAndWaitForVideo as generateRunwayVideoFromImage } from '@/lib/runwayml-client';
import { generateAndWaitForVideo as generatePikaVideoFromImage } from '@/lib/pika-client';

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
import type { AICapability, ProviderName } from './provider-registry';

function normalizeContentType(value: unknown): string {
  return String(value || '').toLowerCase().split(';')[0].trim();
}

function extractErrorMessageFromBuffer(buffer: Buffer): string {
  const text = buffer.toString('utf8').trim();
  if (!text) return 'Empty response body';

  try {
    const parsed = JSON.parse(text);
    return (
      parsed?.message ||
      parsed?.error?.message ||
      parsed?.error_msg ||
      parsed?.detail ||
      text.slice(0, 300)
    );
  } catch {
    if (text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
      return 'Received HTML error response from provider';
    }
    return text.slice(0, 300);
  }
}

function formatAxiosErrorForUser(prefix: string, error: unknown): Error {
  if (!axios.isAxiosError(error)) {
    return new Error(`${prefix}: ${error instanceof Error ? error.message : String(error)}`);
  }

  const status = error.response?.status;
  const data = error.response?.data;

  if (Buffer.isBuffer(data)) {
    return new Error(`${prefix} (${status ?? 'unknown'}): ${extractErrorMessageFromBuffer(data)}`);
  }

  if (typeof data === 'string') {
    const msg = data.includes('<!DOCTYPE') || data.includes('<html')
      ? 'Received HTML error response (check model ID / endpoint / permissions).'
      : data.slice(0, 300);
    return new Error(`${prefix} (${status ?? 'unknown'}): ${msg}`);
  }

  const fallback =
    (data as any)?.message ||
    (data as any)?.error?.message ||
    (data as any)?.error_msg ||
    error.message;

  return new Error(`${prefix} (${status ?? 'unknown'}): ${fallback}`);
}

function isLikelyModelNotFoundError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  if (error.response?.status === 404) return true;

  const data = error.response?.data;
  if (Buffer.isBuffer(data)) {
    return /404|not found|requested url/i.test(data.toString('utf8'));
  }
  if (typeof data === 'string') {
    return /404|not found|requested url/i.test(data);
  }
  const text = JSON.stringify(data || {});
  return /404|not found|requested url/i.test(text);
}

function parseServiceAccountJson(raw: string): Record<string, any> {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error('Google service account JSON is empty.');
  }

  // Accept either raw JSON or base64-encoded JSON.
  const jsonCandidate = trimmed.startsWith('{')
    ? trimmed
    : Buffer.from(trimmed, 'base64').toString('utf8');

  return JSON.parse(jsonCandidate);
}

async function hasGoogleVertexSetup(): Promise<boolean> {
  const { getAdminSettings } = await import('@/server/actions/admin-actions');
  const settings = await getAdminSettings();
  const apiKeys = settings?.apiKeys || {};

  const hasProjectId = Boolean(
    apiKeys.googleCloudProjectId ||
    process.env.GOOGLE_CLOUD_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT
  );

  const hasInlineCredentials = Boolean(
    apiKeys.googleApplicationCredentialsJson ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
  );

  const hasCredentialsFilePath = Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS);
  // Backward-compatible mode: allow direct OAuth bearer token in provider key.
  const hasLegacyAccessToken = Boolean(apiKeys.imagen || apiKeys.googleVeo);

  return hasProjectId && (hasInlineCredentials || hasCredentialsFilePath || hasLegacyAccessToken);
}

async function resolveGoogleVertexAuth(legacyAccessToken?: string): Promise<{ accessToken: string; projectId: string }> {
  const { getAdminSettings } = await import('@/server/actions/admin-actions');
  const settings = await getAdminSettings();
  const apiKeys = settings?.apiKeys || {};

  const projectId =
    apiKeys.googleCloudProjectId ||
    process.env.GOOGLE_CLOUD_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    '';

  if (!projectId) {
    throw new Error('Google Cloud Project ID is missing. Set googleCloudProjectId in Super Admin or GOOGLE_CLOUD_PROJECT_ID env.');
  }

  const inlineCredentialsRaw =
    apiKeys.googleApplicationCredentialsJson ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON ||
    '';

  // Backward compatibility: allow using direct access token in provider key field.
  if (!inlineCredentialsRaw && !process.env.GOOGLE_APPLICATION_CREDENTIALS && legacyAccessToken?.trim()) {
    return { accessToken: legacyAccessToken.trim(), projectId };
  }

  const { GoogleAuth } = await import('google-auth-library');

  const auth = inlineCredentialsRaw
    ? new GoogleAuth({
        credentials: parseServiceAccountJson(inlineCredentialsRaw),
        projectId,
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      })
    : new GoogleAuth({
        projectId,
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      });

  const client = await auth.getClient();
  const tokenResult = await client.getAccessToken();
  const accessToken =
    typeof tokenResult === 'string'
      ? tokenResult
      : tokenResult?.token || '';

  if (!accessToken) {
    throw new Error('Failed to obtain Google OAuth access token from configured service account.');
  }

  return { accessToken, projectId };
}

// Helper function to check provider setup status (now uses database)
async function checkProviderSetup(provider: string): Promise<ProviderMetadata> {
  const metadata = await getProviderMetadata(provider);
  if (metadata?.requiresSetup) {
    // Allow OAuth providers when runtime setup is present in admin/env.
    if ((provider === 'imagen' || provider === 'googleVeo') && await hasGoogleVertexSetup()) {
      return { ...metadata, requiresSetup: false };
    }
    throw new Error(
      `[${provider}] Provider requires setup before use.\n` +
      `Authentication Type: ${metadata.authType}\n` +
      `Setup Instructions: ${metadata.setupInstructions}\n` +
      `This provider is intentionally disabled until proper credentials are configured.`
    );
  }
  return metadata;
}

const PROVIDER_CAPABILITY_SUPPORT: Record<string, AICapability[]> = {
  gemini: ['text', 'text_stream', 'image', 'image_edit', 'tts'],
  openai: ['text', 'text_stream'],
  azureOpenai: ['text', 'text_stream'],
  claude: ['text'],
  huggingface: ['text'],
  imagen: ['image'],
  fal: ['image', 'video'],
  replicate: ['image'],
  googleVeo: ['video'],
  seedance: ['video'],
  runwayml: ['video'],
  pika: ['video'],
  heygen: ['video'],
  wan: ['video'],
  minimax: ['tts', 'video'],
  awsPolly: ['tts'],
  elevenlabs: ['tts'],
};

export function providerSupportsCapability(provider: string, capability: AICapability): boolean {
  return (PROVIDER_CAPABILITY_SUPPORT[provider] || []).includes(capability);
}

export function implementedProviders(): ProviderName[] {
  return Object.keys(PROVIDER_CAPABILITY_SUPPORT) as ProviderName[];
}

function normalizeMessageRole(role: string): 'system' | 'user' | 'assistant' | 'tool' {
  if (role === 'model') return 'assistant';
  if (role === 'assistant' || role === 'system' || role === 'tool') return role;
  return 'user';
}

function extractTextFromContent(content: any): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part: any) => {
        if (typeof part === 'string') return part;
        if (part?.type === 'text' && typeof part?.text === 'string') return part.text;
        if (typeof part?.text === 'string') return part.text;
        return '';
      })
      .join('\n')
      .trim();
  }
  if (content && typeof content === 'object' && typeof content.text === 'string') {
    return content.text;
  }
  return String(content ?? '');
}

function normalizeForOpenAI(messages: any[]) {
  return (messages || []).map((msg: any) => {
    const role = normalizeMessageRole(msg?.role || 'user');
    const text = extractTextFromContent(msg?.content);
    return {
      role,
      content: text,
    };
  });
}

function normalizeForAnthropic(messages: any[]) {
  return (messages || []).map((msg: any) => ({
    role: normalizeMessageRole(msg?.role || 'user') === 'assistant' ? 'assistant' : 'user',
    content: [
      {
        type: 'text',
        text: extractTextFromContent(msg?.content),
      },
    ],
  }));
}

// OpenAI Client
export class OpenAIClient {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async generateText(messages: any[], model: string = 'gpt-4o'): Promise<TextGenerationResponse> {
    try {
      const normalizedMessages = normalizeForOpenAI(messages);
      const response = await this.client.chat.completions.create({
        model,
        messages: normalizedMessages as any,
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
      const normalizedMessages = normalizeForOpenAI(messages);
      const stream = await this.client.chat.completions.create({
        model,
        messages: normalizedMessages as any,
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
      const conversationMessages = normalizeForAnthropic(messages.filter(msg => msg.role !== 'system'));

      const response = await axios.post(
        `${this.baseUrl}/messages`,
        {
          model,
          messages: conversationMessages,
          system: systemMessage ? extractTextFromContent(systemMessage.content) : undefined,
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

  async generateText(messages: any[], model: string = 'gemini-flash-latest'): Promise<TextGenerationResponse> {
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

  async generateTextStream(messages: any[], model: string = 'gemini-flash-latest'): Promise<AsyncIterableIterator<TextGenerationResponse>> {
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

      const contentType = normalizeContentType(response.headers?.['content-type']);
      const audioBuffer = Buffer.from(response.data);
      if (!contentType.startsWith('audio/') || audioBuffer.length < 1024) {
        throw new Error(`ElevenLabs returned non-audio or empty content: ${extractErrorMessageFromBuffer(audioBuffer)}`);
      }
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

function parseAwsPollyCredentials(apiKey: string) {
  const direct = String(apiKey || '').trim();
  try {
    const parsed = JSON.parse(direct) as {
      accessKeyId?: string;
      secretAccessKey?: string;
      region?: string;
      voiceId?: string;
    };

    if (parsed?.accessKeyId && parsed?.secretAccessKey) {
      return {
        accessKeyId: parsed.accessKeyId,
        secretAccessKey: parsed.secretAccessKey,
        region: parsed.region || process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1',
        voiceId: parsed.voiceId,
      };
    }
  } catch {
    // fall through for non-JSON keys
  }

  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_KEY || '';
  return {
    accessKeyId: direct,
    secretAccessKey,
    region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1',
    voiceId: process.env.AWS_POLLY_VOICE_ID,
  };
}

// AWS Polly Client
class AwsPollyClient {
  private polly: AWS.Polly;
  private defaultVoiceId: string;
  private region: string;

  constructor(apiKey: string) {
    if (!apiKey || !apiKey.trim()) {
      throw new Error('AWS Polly credentials are required');
    }

    const credentials = parseAwsPollyCredentials(apiKey);
    if (!credentials.accessKeyId || !credentials.secretAccessKey) {
      throw new Error(
        'AWS Polly credentials incomplete. Use JSON string with accessKeyId and secretAccessKey, or set AWS_* env vars.'
      );
    }

    this.defaultVoiceId = credentials.voiceId || process.env.AWS_POLLY_VOICE_ID || 'Joanna';
    this.region = credentials.region || process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';
    this.polly = new AWS.Polly({
      region: this.region,
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
    });
  }

  async generateSpeech(text: string, voiceId: string = this.defaultVoiceId, model: string = 'neural'): Promise<TTSResponse> {
    try {
      const response = await this.polly
        .synthesizeSpeech({
          Engine: model === 'standard' ? 'standard' : 'neural',
          OutputFormat: 'mp3',
          TextType: 'text',
          VoiceId: voiceId || this.defaultVoiceId,
          Text: text,
        })
        .promise();

      if (!response.AudioStream) {
        throw new Error('AWS Polly returned no audio payload');
      }

      const audioStream = response.AudioStream as unknown;
      let audioBuffer: Buffer;

      if (Buffer.isBuffer(audioStream)) {
        audioBuffer = audioStream;
      } else if (typeof audioStream === 'string') {
        audioBuffer = Buffer.from(audioStream);
      } else if ((audioStream as any)[Symbol.asyncIterator]) {
        const chunks: Buffer[] = [];
        for await (const chunk of audioStream as AsyncIterable<Buffer>) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        audioBuffer = Buffer.concat(chunks);
      } else {
        throw new Error('AWS Polly returned audio stream in an unsupported format');
      }

      if (!audioBuffer.length) {
        throw new Error('AWS Polly returned empty audio payload');
      }

      const audioDataUri = `data:audio/mp3;base64,${audioBuffer.toString('base64')}`;
      const { uploadToWasabi } = await import('@/server/services/wasabi-service');
      const { publicUrl } = await uploadToWasabi(audioDataUri, 'audio');

      return {
        audioUrl: publicUrl,
        model,
        provider: 'awsPolly'
      };
    } catch (error) {
      console.error('[AWS Polly] TTS error:', error);
      throw error;
    }
  }
}

// Minimax (Hailuo) Client
export class MinimaxClient {
  private apiKey: string;
  private baseUrl: string = 'https://api.minimax.io/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateVideo(prompt: string, model: string = 't2v-01'): Promise<VideoGenerationResponse> {
    try {
      const startResponse = await axios.post(
        `${this.baseUrl}/video_generation`,
        {
          model,
          prompt,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 45000,
        }
      );

      const directVideoUrl =
        startResponse.data?.video_url ||
        startResponse.data?.videoUrl ||
        startResponse.data?.data?.video_url ||
        startResponse.data?.result?.video_url;

      if (directVideoUrl) {
        const { uploadToWasabi } = await import('@/server/services/wasabi-service');
        const videoResponse = await fetch(directVideoUrl);
        const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
        const videoDataUri = `data:video/mp4;base64,${videoBuffer.toString('base64')}`;
        const { publicUrl } = await uploadToWasabi(videoDataUri, 'videos');
        return {
          videoUrl: publicUrl,
          model,
          provider: 'minimax',
        };
      }

      const taskId = startResponse.data?.task_id || startResponse.data?.id || startResponse.data?.data?.id;
      if (!taskId) {
        throw new Error('MiniMax Hailuo did not return a task id or direct URL');
      }

      const taskResult = await this.pollVideoTask(taskId);
      const taskVideoUrl =
        taskResult?.video_url ||
        taskResult?.videoUrl ||
        taskResult?.result?.video_url ||
        taskResult?.result?.video?.url;

      if (!taskVideoUrl) {
        throw new Error('MiniMax Hailuo task completed without a video URL');
      }

      const { uploadToWasabi } = await import('@/server/services/wasabi-service');
      const videoResponse = await fetch(taskVideoUrl);
      const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
      const videoDataUri = `data:video/mp4;base64,${videoBuffer.toString('base64')}`;
      const { publicUrl } = await uploadToWasabi(videoDataUri, 'videos');

      return {
        videoUrl: publicUrl,
        model,
        provider: 'minimax',
      };
    } catch (error) {
      console.error('[MiniMax Hailuo] Video generation error:', error);
      throw error;
    }
  }

  private async pollVideoTask(taskId: string, maxAttempts = 80, intervalMs = 5000): Promise<any> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise(resolve => setTimeout(resolve, intervalMs));

      const response = await axios.get(`${this.baseUrl}/video_generation/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      const status = String(response.data?.status || '').toLowerCase();
      if (status === 'succeeded' || status === 'completed' || status === 'finished') {
        return response.data;
      }

      if (status === 'failed' || status === 'error') {
        throw new Error(`MiniMax Hailuo task failed: ${response.data?.message || response.data?.error || status}`);
      }
    }

    throw new Error('MiniMax Hailuo video generation timed out');
  }

  async generateSpeech(text: string, voiceId: string = 'female-tianmei', model: string = 'speech-01'): Promise<TTSResponse> {
    try {
      const voiceSettings: Record<string, string> = {
        'female-tianmei': 'female-tianmei',
        'male-qianxue': 'male-qianxue',
        'presenter_male': 'presenter_male',
        'presenter_female': 'presenter_female',
      };

      const selectedVoice = voiceSettings[voiceId] || voiceId;

      const response = await axios.post(
        `${this.baseUrl}/text_to_speech`,
        {
          model,
          text,
          voice_id: selectedVoice,
          speed: 1.0,
          vol: 1.0,
          pitch: 1.0,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          responseType: 'arraybuffer',
        }
      );

      const contentType = normalizeContentType(response.headers?.['content-type']);
      let audioBuffer = Buffer.from(response.data);

      if (!contentType.startsWith('audio/')) {
        // Some Minimax endpoints return JSON with audio_url/audio_base64 even on HTTP 200.
        const payloadText = audioBuffer.toString('utf8').trim();
        let parsed: any = null;
        try {
          parsed = JSON.parse(payloadText);
        } catch {
          throw new Error(`Minimax returned non-audio response: ${payloadText.slice(0, 300)}`);
        }

        const baseRespCode = parsed?.base_resp?.status_code;
        if (typeof baseRespCode === 'number' && baseRespCode !== 0) {
          const message = parsed?.base_resp?.status_msg || parsed?.message || 'Unknown Minimax error';
          throw new Error(`Minimax API error: ${message}`);
        }

        const audioBase64 =
          parsed?.audio_base64 ||
          parsed?.data?.audio_base64 ||
          parsed?.result?.audio_base64 ||
          parsed?.data?.audio ||
          parsed?.audio;

        const audioUrl =
          parsed?.audio_url ||
          parsed?.data?.audio_url ||
          parsed?.result?.audio_url ||
          parsed?.data?.url;

        if (typeof audioBase64 === 'string' && audioBase64.length > 0) {
          audioBuffer = Buffer.from(audioBase64, 'base64');
        } else if (typeof audioUrl === 'string' && audioUrl.startsWith('http')) {
          const audioResponse = await fetch(audioUrl);
          if (!audioResponse.ok) {
            throw new Error(`Minimax returned audio URL but fetch failed (${audioResponse.status})`);
          }
          audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
        } else {
          throw new Error(`Minimax returned JSON without audio payload: ${payloadText.slice(0, 300)}`);
        }
      }

      if (audioBuffer.length < 1024) {
        throw new Error('Minimax returned audio that is too small to be valid.');
      }

      const audioDataUri = `data:audio/mp3;base64,${audioBuffer.toString('base64')}`;

      const { uploadToWasabi } = await import('@/server/services/wasabi-service');
      const { publicUrl } = await uploadToWasabi(audioDataUri, 'audio');

      return {
        audioUrl: publicUrl,
        model,
        provider: 'minimax'
      };
    } catch (error) {
      console.error('[Minimax] TTS error:', error);
      
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const errorData = error.response?.data;
        
        if (status === 401 || status === 403) {
          throw new Error('Minimax API authentication failed. Please check your API key.');
        }
        
        if (status === 402 || status === 429) {
          const message = errorData?.message || 'No credits available';
          console.warn('[Minimax] Credits exhausted or rate limited:', message);
          throw new Error(`Minimax: ${message}`);
        }
        
        if (errorData?.error?.message) {
          throw new Error(`Minimax API error: ${errorData.error.message}`);
        }
      }
      
      throw error;
    }
  }
}

// Imagen Client - FIXED for proper Google Cloud integration
export class ImagenClient {
  private legacyAccessToken: string;
  private baseUrl: string = 'https://us-central1-aiplatform.googleapis.com';

  constructor(apiKey: string) {
    // Backward compatibility: this may contain a direct OAuth bearer token.
    this.legacyAccessToken = apiKey;
  }

  async generateImage(prompt: string, model: string = 'imagen-4.0-generate-001'): Promise<ImageGenerationResponse> {
    try {
      const { accessToken, projectId } = await resolveGoogleVertexAuth(this.legacyAccessToken);

      // Accept either prefixed model ids (googleai/...) or raw Vertex ids.
      const rawModel = model.includes('/') ? model.split('/').pop() || model : model;
      // Keep legacy compatibility for old Imagen 3 identifier.
      const vertexModel = rawModel === 'imagen-3.0-generate-001' ? 'imagegeneration@006' : rawModel;

      // Using the correct Google Cloud Vertex AI endpoint with actual project ID
      const endpoint = `${this.baseUrl}/v1/projects/${projectId}/locations/us-central1/publishers/google/models/${vertexModel}:predict`;

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
            'Authorization': `Bearer ${accessToken}`,
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
        model: vertexModel,
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
  private legacyAccessToken: string;
  private baseUrl: string = 'https://us-central1-aiplatform.googleapis.com';

  constructor(apiKey: string) {
    // Backward compatibility: this may contain a direct OAuth bearer token.
    this.legacyAccessToken = apiKey;
  }

  async generateVideo(prompt: string, model: string = 'veo-3.0-generate-001'): Promise<VideoGenerationResponse> {
    try {
      const { accessToken, projectId } = await resolveGoogleVertexAuth(this.legacyAccessToken);

      // Accept either prefixed model ids (googleai/...) or raw Vertex ids.
      const rawModel = model.includes('/') ? model.split('/').pop() || model : model;
      const normalizedModel = rawModel.replace(/-[a-f0-9]{8,}$/i, '');
      // Try veo-2.0 first (generally available), then the requested model, then veo-3.0 last
      // (veo-3.0 requires special Google Cloud allowlist access and is not publicly available)
      const candidateModels = Array.from(
        new Set(['veo-2.0-generate-001', rawModel, normalizedModel, 'veo-3.0-generate-001'].filter(Boolean))
      );

      for (const vertexModel of candidateModels) {
        try {
          // Using the correct Google Cloud Vertex AI endpoint with actual project ID
          // Video generation is async, so we use predictLongRunning
          const endpoint = `${this.baseUrl}/v1/projects/${projectId}/locations/us-central1/publishers/google/models/${vertexModel}:predictLongRunning`;

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
                'Authorization': `Bearer ${accessToken}`,
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
                  'Authorization': `Bearer ${accessToken}`,
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

            console.log(`[GoogleVeo] Polling attempt ${attempt + 1}/${maxAttempts} (model=${vertexModel})...`);
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
            model: vertexModel,
            provider: 'googleVeo'
          };
        } catch (modelError) {
          if (isLikelyModelNotFoundError(modelError)) {
            console.warn(`[GoogleVeo] Model not found or unavailable: ${vertexModel}. Trying next candidate.`);
            continue;
          }
          throw modelError;
        }
      }

      throw new Error(
        `Google Veo model not found/accessible for project ${projectId}. Tried: ${candidateModels.join(', ')}`
      );
    } catch (error) {
      console.error('[GoogleVeo] Video generation error:', error);
      if (axios.isAxiosError(error) && error.response) {
        console.error('[GoogleVeo] API Response:', error.response.data);
        throw formatAxiosErrorForUser('Google Veo API error', error);
      }
      // Strip raw HTML from any error message before surfacing to the user
      const rawMessage = error instanceof Error ? error.message : String(error);
      const isHtml = rawMessage.includes('<!DOCTYPE') || rawMessage.includes('<html');
      if (isHtml) {
        throw new Error(
          'Video generation failed: The Google Veo API returned an error page. ' +
          'Please verify that (1) the Vertex AI API is enabled in your Google Cloud project, ' +
          '(2) your project has been granted access to Veo models, and ' +
          '(3) the correct Google Cloud Project ID and credentials are set in admin settings.'
        );
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

// Fal AI Client
class FalClient {
  private apiKey: string;
  private baseUrl: string = 'https://fal.run';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private getHeaders() {
    return {
      'Authorization': `Key ${this.apiKey}`,
      'x-api-key': this.apiKey,
      'Content-Type': 'application/json',
    };
  }

  private parsePrompt(prompt: string): { prompt: string; imageUrl?: string } {
    const imageMatch = prompt.match(/Image:\s*(https?:\/\/\S+)/i) || prompt.match(/image[_-]url:\s*(https?:\/\/\S+)/i);
    if (!imageMatch) {
      return { prompt };
    }

    return {
      prompt: prompt.replace(imageMatch[0], '').replace(/\s+$/, '').trim(),
      imageUrl: imageMatch[1],
    };
  }

  private pickMediaUrl(payload: any, kind: 'image' | 'video'): string | null {
    const candidates = kind === 'image'
      ? [
          payload?.images?.[0]?.url,
          payload?.image?.url,
          payload?.output?.image_url,
          payload?.output?.images?.[0]?.url,
          payload?.url,
        ]
      : [
          payload?.video_url,
          payload?.videoUrl,
          payload?.output?.video_url,
          payload?.output?.videoUrl,
          payload?.video?.url,
          payload?.output?.video?.url,
          payload?.url,
        ];

    return candidates.find((value) => typeof value === 'string' && value.startsWith('http')) || null;
  }

  private async uploadMedia(mediaUrl: string, kind: 'image' | 'video'): Promise<string> {
    const response = await fetch(mediaUrl);
    const arrayBuffer = await response.arrayBuffer();
    const mediaBuffer = Buffer.from(arrayBuffer);
    const dataUri = `${kind === 'image' ? 'data:image/png;base64,' : 'data:video/mp4;base64,'}${mediaBuffer.toString('base64')}`;
    const { uploadToWasabi } = await import('@/server/services/wasabi-service');
    const { publicUrl } = await uploadToWasabi(dataUri, kind === 'image' ? 'images' : 'videos');
    return publicUrl;
  }

  private async waitForFalResult(model: string, requestId: string): Promise<any> {
    const statusUrl = `${this.baseUrl}/${model}/requests/${requestId}`;
    const maxAttempts = 120;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 2500));
      const statusResponse = await axios.get(statusUrl, {
        headers: this.getHeaders(),
      });

      const status = String(statusResponse.data?.status || '').toLowerCase();
      const output = statusResponse.data?.output;

      if (status === 'completed' || status === 'succeeded' || status === 'ready' || status === 'finished') {
        return output || statusResponse.data;
      }

      if (status === 'failed' || status === 'error' || status === 'canceled') {
        throw new Error(
          `Fal job failed (${requestId}): ${statusResponse.data?.error?.message || statusResponse.data?.detail || statusResponse.data}`
        );
      }
    }

    throw new Error(`Fal job timed out after ${maxAttempts} attempts`);
  }

  private async generateFromFal(
    model: string,
    input: Record<string, any>,
    kind: 'image' | 'video'
  ): Promise<string> {
    const startResponse = await axios.post(`${this.baseUrl}/${model}`, input, {
      headers: this.getHeaders(),
      timeout: 30000,
    });

    const immediateResultUrl = this.pickMediaUrl(startResponse.data, kind);
    if (immediateResultUrl) {
      return await this.uploadMedia(immediateResultUrl, kind);
    }

    const requestId = startResponse.data?.request_id || startResponse.data?.id || startResponse.data?.requestId;
    if (!requestId) {
      throw new Error(`Fal did not return a direct result or request ID for model ${model}`);
    }

    const finalResult = await this.waitForFalResult(model, requestId);
    const resultUrl = this.pickMediaUrl(finalResult, kind);
    if (!resultUrl) {
      throw new Error(`Fal returned no ${kind} output URL for request ${requestId}`);
    }

    return await this.uploadMedia(resultUrl, kind);
  }

  async generateImage(prompt: string, model: string = 'fal-ai/flux/schnell'): Promise<ImageGenerationResponse> {
    try {
      const imageUrl = await this.generateFromFal(model, { prompt }, 'image');
      return {
        imageUrl,
        model,
        provider: 'fal'
      };
    } catch (error) {
      console.error('[Fal] Image generation error:', error);
      throw error;
    }
  }

  async generateVideo(prompt: string, model: string = 'fal-ai/animatediff'): Promise<VideoGenerationResponse> {
    try {
      const parsed = this.parsePrompt(prompt);
      const input: Record<string, any> = {
        prompt: parsed.prompt || 'Generate a short cinematic clip based on the provided prompt.',
      };

      if (parsed.imageUrl) {
        input.image_url = parsed.imageUrl;
      }

      const videoUrl = await this.generateFromFal(model, input, 'video');
      return {
        videoUrl,
        model,
        provider: 'fal'
      };
    } catch (error) {
      console.error('[Fal] Video generation error:', error);
      throw error;
    }
  }
}

class RunwayMlClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private extractImagePrompt(prompt: string): { imagePrompt: string; imageUrl?: string } {
    const imageMatch = prompt.match(/Image:\s*(https?:\/\/\S+)/i) || prompt.match(/image[_-]url:\s*(https?:\/\/\S+)/i);
    if (!imageMatch) {
      return { imagePrompt: prompt };
    }

    return {
      imagePrompt: prompt.replace(imageMatch[0], '').replace(/\s+$/, '').trim(),
      imageUrl: imageMatch[1],
    };
  }

  private async ensureImageUrl(prompt: string): Promise<string> {
    const parsed = this.extractImagePrompt(prompt);
    if (parsed.imageUrl) return parsed.imageUrl;

    const { getAdminSettings } = await import('@/server/actions/admin-actions');
    const { apiKeys } = await getAdminSettings();
    if (!apiKeys.fal) {
      throw new Error(
        'Runway fallback needs an image to animate. Include image URL in the prompt or configure Fal API key for bootstrap image generation.'
      );
    }

    const fallbackImagePrompt = parsed.imagePrompt || 'A cinematic scene for video generation.';
    const falClient = new FalClient(apiKeys.fal);
    const image = await falClient.generateImage(fallbackImagePrompt, 'fal-ai/flux/schnell');
    return image.imageUrl;
  }

  async generateVideo(prompt: string, model: string = 'runwayml-image-to-video'): Promise<VideoGenerationResponse> {
    try {
      const parsed = this.extractImagePrompt(prompt);
      const imageUrl = await this.ensureImageUrl(parsed.imagePrompt);
      const videoPrompt = parsed.imagePrompt || 'Animate this scene';
      const videoUrl = await generateRunwayVideoFromImage(imageUrl, videoPrompt);
      return { videoUrl, model, provider: 'runwayml' };
    } catch (error) {
      console.error('[RunwayML] Video generation error:', error);
      throw error;
    }
  }
}

class PikaClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private extractImagePrompt(prompt: string): { imagePrompt: string; imageUrl?: string } {
    const imageMatch = prompt.match(/Image:\s*(https?:\/\/\S+)/i) || prompt.match(/image[_-]url:\s*(https?:\/\/\S+)/i);
    if (!imageMatch) {
      return { imagePrompt: prompt };
    }

    return {
      imagePrompt: prompt.replace(imageMatch[0], '').replace(/\s+$/, '').trim(),
      imageUrl: imageMatch[1],
    };
  }

  private async ensureImageUrl(prompt: string): Promise<string> {
    const parsed = this.extractImagePrompt(prompt);
    if (parsed.imageUrl) return parsed.imageUrl;

    const { getAdminSettings } = await import('@/server/actions/admin-actions');
    const { apiKeys } = await getAdminSettings();
    if (!apiKeys.fal) {
      throw new Error(
        'Pika fallback needs an image to animate. Include image URL in the prompt or configure Fal API key for bootstrap image generation.'
      );
    }

    const fallbackImagePrompt = parsed.imagePrompt || 'A cinematic scene for video generation.';
    const falClient = new FalClient(apiKeys.fal);
    const image = await falClient.generateImage(fallbackImagePrompt, 'fal-ai/flux/schnell');
    return image.imageUrl;
  }

  async generateVideo(prompt: string, model: string = 'pika-image-to-video'): Promise<VideoGenerationResponse> {
    try {
      const parsed = this.extractImagePrompt(prompt);
      const imageUrl = await this.ensureImageUrl(parsed.imagePrompt);
      const videoPrompt = parsed.imagePrompt || 'Animate this scene';
      const videoUrl = await generatePikaVideoFromImage(imageUrl, videoPrompt);
      return { videoUrl, model, provider: 'pika' };
    } catch (error) {
      console.error('[Pika] Video generation error:', error);
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
    case 'fal':
      return new FalClient(apiKey);
    case 'minimax':
      return new MinimaxClient(apiKey);
    case 'replicate':
      return new ReplicateClient(apiKey);
    case 'huggingface':
      return new HuggingFaceClient(apiKey);
    case 'imagen':
      return new ImagenClient(apiKey);
    case 'googleVeo':
      return new GoogleVeoClient(apiKey);
    case 'awsPolly':
      return new AwsPollyClient(apiKey);
    case 'heygen':
      return new HeyGenClient(apiKey);
    case 'runwayml':
      return new RunwayMlClient(apiKey);
    case 'pika':
      return new PikaClient(apiKey);
    case 'seedance':
      return new SeedanceClient(apiKey);
    case 'wan':
      return new WanClient(apiKey);
    case 'elevenlabs':
      return new ElevenLabsClient(apiKey);
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}
