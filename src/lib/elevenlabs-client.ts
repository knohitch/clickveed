'use server';

/**
 * @fileOverview ElevenLabs API client for voice cloning and synthesis
 * This file provides a simple interface for interacting with the ElevenLabs API
 */

import axios from 'axios';
import { getAdminSettings } from '@/server/actions/admin-actions';

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

// Function to get the ElevenLabs API key from admin settings
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
  // We're assuming the audioFiles are URLs to downloadable audio files
  // In a real implementation, you would need to fetch these files and add them as Blobs
  for (const fileUrl of audioFiles) {
    try {
      const response = await axios.get(fileUrl, { responseType: 'blob' });
      formData.append('files', response.data);
    } catch (error) {
      console.error(`Error fetching audio file from ${fileUrl}:`, error);
      throw new Error(`Failed to fetch audio file from ${fileUrl}`);
    }
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
    const response = await axios.post(`${ELEVENLABS_API_URL}/voices/add`, formData, {
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'multipart/form-data'
      }
    });
    
    return {
      voiceId: response.data.voice_id,
      name: response.data.name,
      category: 'cloned'
    };
  } catch (error) {
    console.error('Error adding voice to ElevenLabs:', error);
    
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(`ElevenLabs API error (${error.response.status}): ${error.response.data.detail || 'Unknown error'}`);
    }
    
    throw new Error('Failed to add voice to ElevenLabs');
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
        responseType: 'arraybuffer'
      }
    );
    
    return response.data;
  } catch (error) {
    console.error(`Error generating speech with voice ${voiceId}:`, error);
    
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(`ElevenLabs API error (${error.response.status}): ${error.response.data.detail || 'Unknown error'}`);
    }
    
    throw new Error(`Failed to generate speech with voice ${voiceId}`);
  }
}
