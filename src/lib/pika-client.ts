'use server';

/**
 * @fileOverview Pika API client for text-to-video and image-to-video generation
 * This file provides an interface for interacting with the Pika API
 */

import axios from 'axios';
import { getAdminSettings } from '@/server/actions/admin-actions';

const PIKA_API_URL = 'https://api.pika.art/v1';

// Function to get the Pika API key from admin settings
export async function getPikaApiKey(): Promise<string> {
  const { apiKeys } = await getAdminSettings();
  
  if (!apiKeys.pika) {
    throw new Error('Pika API key is not configured in admin settings');
  }
  
  return apiKeys.pika;
}

// Interface definitions for Pika API
export interface PikaVideoGenerationResponse {
  id: string;       // The task ID returned by Pika
  status: string;   // Status of the video generation task
}

export interface PikaVideoStatusResponse {
  id: string;
  status: string;   // 'pending', 'processing', 'completed', 'failed'
  videoUrl?: string; // Present when status is 'completed'
  errorMessage?: string; // Present when status is 'failed'
}

export interface PikaVideoGenerationOptions {
  negativePrompt?: string;  // Things to avoid in the video
  cfgScale?: number;        // How closely to follow the prompt (1-10)
  steps?: number;           // Generation quality/detail (10-50)
  width?: number;           // Video width (must be multiple of 8)
  height?: number;          // Video height (must be multiple of 8)
  numberOfFrames?: number;  // Video length (20-180)
  fps?: number;             // Frames per second (6-30)
}

/**
 * Generate a video from an image and a description
 * 
 * @param imageUrl URL of the image to use as the base
 * @param prompt Text description of how the image should be animated
 * @param options Additional generation options
 */
export async function generateVideoFromImage(
  imageUrl: string,
  prompt: string,
  options?: PikaVideoGenerationOptions
): Promise<PikaVideoGenerationResponse> {
  const apiKey = await getPikaApiKey();

  try {
    const response = await axios.post(
      `${PIKA_API_URL}/image-to-video`,
      {
        imageUrl,
        prompt,
        negativePrompt: options?.negativePrompt || '',
        cfgScale: options?.cfgScale || 7,
        steps: options?.steps || 30,
        width: options?.width || 576,
        height: options?.height || 320,
        numberOfFrames: options?.numberOfFrames || 90,
        fps: options?.fps || 24
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );

    return {
      id: response.data.id,
      status: 'pending'
    };
  } catch (error) {
    console.error('Error generating video with Pika:', error);
    
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(`Pika API error (${error.response.status}): ${error.response.data.message || 'Unknown error'}`);
    }
    
    throw new Error('Failed to generate video with Pika');
  }
}

/**
 * Check the status of a video generation task
 * 
 * @param taskId The ID of the generation task
 */
export async function getVideoGenerationStatus(taskId: string): Promise<PikaVideoStatusResponse> {
  const apiKey = await getPikaApiKey();
  
  try {
    const response = await axios.get(
      `${PIKA_API_URL}/generations/${taskId}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );

    return {
      id: taskId,
      status: response.data.status,
      videoUrl: response.data.videoUrl,
      errorMessage: response.data.errorMessage
    };
  } catch (error) {
    console.error(`Error checking status for task ${taskId}:`, error);
    
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(`Pika API error (${error.response.status}): ${error.response.data.message || 'Unknown error'}`);
    }
    
    throw new Error(`Failed to check status for task ${taskId}`);
  }
}

/**
 * Poll for the status of a video generation task until it completes or fails
 * 
 * @param taskId The ID of the generation task
 * @param maxAttempts Maximum number of polling attempts
 * @param intervalMs Time in milliseconds between polling attempts
 */
export async function waitForVideoGeneration(
  taskId: string,
  maxAttempts = 60,
  intervalMs = 5000
): Promise<PikaVideoStatusResponse> {
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    const status = await getVideoGenerationStatus(taskId);
    
    if (status.status === 'completed' || status.status === 'failed') {
      return status;
    }
    
    // Wait before checking again
    await new Promise(resolve => setTimeout(resolve, intervalMs));
    attempts++;
  }
  
  throw new Error(`Video generation timed out after ${maxAttempts} attempts`);
}

/**
 * Helper function to generate a video and wait for completion
 * This is a convenience function that combines generation and polling
 * 
 * @param imageUrl URL of the image to use as the base
 * @param prompt Text description of how the image should be animated
 * @param options Additional generation options
 */
export async function generateAndWaitForVideo(
  imageUrl: string,
  prompt: string,
  options?: PikaVideoGenerationOptions
): Promise<string> {
  const generation = await generateVideoFromImage(imageUrl, prompt, options);
  const result = await waitForVideoGeneration(generation.id);
  
  if (result.status === 'failed') {
    throw new Error(`Video generation failed: ${result.errorMessage || 'Unknown error'}`);
  }
  
  if (!result.videoUrl) {
    throw new Error('Video generation completed but no URL was provided');
  }
  
  return result.videoUrl;
}
