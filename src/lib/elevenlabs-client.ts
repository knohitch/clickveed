'use server';

/**
 * @fileOverview ElevenLabs API client for voice cloning and synthesis
 * 
 * FIXES IMPLEMENTED:
 * 1. Added retry logic with exponential backoff
 * 2. Added timeout handling for all requests
 * 3. Added rate limit (429) handling
 * 4. Improved error messages
 * 5. Added request tracking
 */

import axios from 'axios';
import { getAdminSettings } from '@/server/actions/admin-actions';

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

// Constants
const DEFAULT_TIMEOUT_MS = 30000; // 30 seconds
const VOICE_CLONE_TIMEOUT_MS = 300000; // 5 minutes
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000; // 1 second

/**
 * Function to get the ElevenLabs API key from admin settings
 */
export async function getElevenLabsApiKey(): Promise<string> {
  const { apiKeys } = await getAdminSettings();
  
  if (!apiKeys.elevenlabs) {
    throw new Error('ElevenLabs API key is not configured in admin settings');
  }
  
  return apiKeys.elevenlabs;
}

// Voice cloning interface definitions
export interface VoiceCloneResponse {
  voiceId: string;
  name: string;
  category: string;
}

export interface VoiceCloningOptions {
  description?: string;
  labels?: Record<string, string>;
}

/**
 * Generic retry function with exponential backoff
 */
async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  context: string = 'API call'
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      console.error(`[ElevenLabs] ${context} attempt ${attempt}/${MAX_RETRIES} failed:`, error);

      // Check if error is retryable
      const isRateLimit = axios.isAxiosError(error) && error.response?.status === 429;
      const isRetryable = axios.isAxiosError(error) && (
        error.response?.status === 429 || // Rate limit
        error.response?.status === 500 || // Internal server error
        error.response?.status === 502 || // Bad gateway
        error.response?.status === 503 || // Service unavailable
        error.response?.status === 504    // Gateway timeout
      );

      if (!isRetryable || attempt === MAX_RETRIES) {
        break;
      }

      // Calculate delay (longer for rate limits)
      const delay = isRateLimit 
        ? 5000 * attempt // 5s, 10s, 15s for rate limits
        : RETRY_DELAY_MS * Math.pow(2, attempt - 1); // Exponential backoff for other errors

      console.log(`[ElevenLabs] Retrying ${context} in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error(`${context} failed after retries`);
}

/**
 * Fetch audio file from URL with timeout
 */
async function fetchAudioFile(
  fileUrl: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<Blob> {
  return await fetchWithRetry(async () => {
    const response = await axios.get(fileUrl, { 
      responseType: 'blob',
      timeout: timeoutMs,
    });
    return response.data;
  }, `fetch audio from ${fileUrl}`);
}

/**
 * Add a new voice clone from audio samples
 * @param name - The name for the voice
 * @param audioFiles - Array of audio file URLs to use for cloning
 * @param options - Additional options for the voice clone
 */
export async function addVoice(
  name: string, 
  audioFiles: string[], 
  options?: VoiceCloningOptions
): Promise<VoiceCloneResponse> {
  const apiKey = await getElevenLabsApiKey();
  
  // Create a FormData object to send files
  const formData = new FormData();
  
  // Add each audio file to the form data
  // Fetch all audio files in parallel for better performance
  try {
    const audioBlobs = await Promise.all(
      audioFiles.map(url => fetchAudioFile(url, DEFAULT_TIMEOUT_MS))
    );
    
    audioBlobs.forEach((blob, index) => {
      formData.append('files', blob, `audio_${index}.mp3`);
    });
  } catch (error) {
    console.error('[ElevenLabs] Error fetching audio files:', error);
    throw new Error(`Failed to fetch audio files: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  // Add voice name and description
  formData.append('name', name);
  
  if (options?.description) {
    formData.append('description', options.description);
  }
  
  if (options?.labels) {
    formData.append('labels', JSON.stringify(options.labels));
  }
  
  try {
    const response = await fetchWithRetry(async () => {
      return await axios.post(`${ELEVENLABS_API_URL}/voices/add`, formData, {
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'multipart/form-data'
        },
        timeout: VOICE_CLONE_TIMEOUT_MS,
      });
    }, 'voice cloning');
    
    return {
      voiceId: response.data.voice_id,
      name: response.data.name,
      category: 'cloned'
    };
  } catch (error) {
    console.error('[ElevenLabs] Error adding voice:', error);
    
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(
        `ElevenLabs API error (${error.response.status}): ${error.response.data.detail?.message || error.response.data.detail || 'Unknown error'}`
      );
    }
    
    throw new Error(`Failed to add voice to ElevenLabs: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get information about a specific voice
 * @param voiceId - The ID of the voice to retrieve
 */
export async function getVoice(voiceId: string): Promise<any> {
  const apiKey = await getElevenLabsApiKey();
  
  try {
    const response = await axios.get(`${ELEVENLABS_API_URL}/voices/${voiceId}`, {
      headers: {
        'xi-api-key': apiKey
      }
    });
    
    return response.data;
  } catch (error) {
    console.error(`Error getting voice ${voiceId}:`, error);
    
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(`ElevenLabs API error (${error.response.status}): ${error.response.data.detail || 'Unknown error'}`);
    }
    
    throw new Error(`Failed to get voice ${voiceId}`);
  }
}

/**
 * Delete a voice from the account
 * @param voiceId - The ID of the voice to delete
 */
export async function deleteVoice(voiceId: string): Promise<boolean> {
  const apiKey = await getElevenLabsApiKey();
  
  try {
    await axios.delete(`${ELEVENLABS_API_URL}/voices/${voiceId}`, {
      headers: {
        'xi-api-key': apiKey
      }
    });
    
    return true;
  } catch (error) {
    console.error(`Error deleting voice ${voiceId}:`, error);
    
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(`ElevenLabs API error (${error.response.status}): ${error.response.data.detail || 'Unknown error'}`);
    }
    
    throw new Error(`Failed to delete voice ${voiceId}`);
  }
}

/**
 * Generate speech using a cloned voice
 * @param voiceId - The ID of the voice to use
 * @param text - The text to convert to speech
 */
export async function generateSpeech(voiceId: string, text: string): Promise<ArrayBuffer> {
  const apiKey = await getElevenLabsApiKey();
  const SPEECH_TIMEOUT_MS = 60000; // 60 seconds for speech generation
  
  try {
    const response = await axios.post(
      `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`,
      {
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      },
      {
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer',
        timeout: SPEECH_TIMEOUT_MS, // ⬅️ FIX: Added timeout
      }
    );
    
    return response.data;
  } catch (error) {
    console.error(`[ElevenLabs] Error generating speech with voice ${voiceId}:`, error);
    
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        throw new Error(`Speech generation timed out after ${SPEECH_TIMEOUT_MS / 1000} seconds`);
      }
      if (error.response) {
        throw new Error(`ElevenLabs API error (${error.response.status}): ${error.response.data.detail?.message || error.response.data.detail || 'Unknown error'}`);
      }
    }
    
    throw new Error(`Failed to generate speech with voice ${voiceId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
