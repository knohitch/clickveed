'use server';

/**
 * @fileOverview RunwayML API client for image-to-video generation
 * This file provides an interface for interacting with the RunwayML Gen-2 API
 */

import axios from 'axios';
import { getAdminSettings } from '@/server/actions/admin-actions';

const RUNWAY_API_URL = 'https://api.runwayml.com/v1';

// Function to get the RunwayML API key from admin settings
export async function getRunwayApiKey(): Promise<string> {
  const { apiKeys } = await getAdminSettings();
  
  if (!apiKeys.runwayml) {
    throw new Error('RunwayML API key is not configured in admin settings');
  }
  
  return apiKeys.runwayml;
}

// Interface definitions for RunwayML API
export interface RunwayVideoGenerationResponse {
  id: string;         // The job ID returned by RunwayML
  status: string;     // Status of the video generation job
}

export interface RunwayVideoStatusResponse {
  id: string;
  status: string;     // 'processing', 'complete', 'failed'
  videoUrl?: string;  // Present when status is 'complete'
  errorMessage?: string; // Present when status is 'failed'
}

export interface RunwayVideoGenerationOptions {
  cfgScale?: number;        // How closely to follow the prompt (1-30)
  numFrames?: number;       // Video length (default: 24 frames)
  motionBucketId?: number;  // Motion scale (0-255)
  modelVersion?: string;    // Model version to use
}

/**
 * Generate a video from an image and a description using RunwayML Gen-2
 * 
 * @param imageUrl URL of the image to use as the base
 * @param prompt Text description of how the image should be animated
 * @param options Additional generation options
 */
export async function generateVideoFromImage(
  imageUrl: string,
  prompt: string,
  options?: RunwayVideoGenerationOptions
): Promise<RunwayVideoGenerationResponse> {
  const apiKey = await getRunwayApiKey();

  try {
    const response = await axios.post(
      `${RUNWAY_API_URL}/gen-2`,
      {
        input: {
          image: imageUrl,
          prompt: prompt,
        },
        cfgScale: options?.cfgScale || 7,
        numFrames: options?.numFrames || 24,
        motionBucketId: options?.motionBucketId || 127,
        modelVersion: options?.modelVersion || 'v2.0'
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );

    return {
      id: response.data.job_id,
      status: 'processing'
    };
  } catch (error) {
    console.error('Error generating video with RunwayML:', error);
    
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(`RunwayML API error (${error.response.status}): ${error.response.data.error || 'Unknown error'}`);
    }
    
    throw new Error('Failed to generate video with RunwayML');
  }
}

/**
 * Check the status of a video generation job
 * 
 * @param jobId The ID of the generation job
 */
export async function getVideoGenerationStatus(jobId: string): Promise<RunwayVideoStatusResponse> {
  const apiKey = await getRunwayApiKey();
  
  try {
    const response = await axios.get(
      `${RUNWAY_API_URL}/jobs/${jobId}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );

    return {
      id: jobId,
      status: response.data.status,
      videoUrl: response.data.output?.video, // Video URL if completed
      errorMessage: response.data.error
    };
  } catch (error) {
    console.error(`Error checking status for job ${jobId}:`, error);
    
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(`RunwayML API error (${error.response.status}): ${error.response.data.error || 'Unknown error'}`);
    }
    
    throw new Error(`Failed to check status for job ${jobId}`);
  }
}

/**
 * Poll for the status of a video generation job until it completes or fails
 * 
 * @param jobId The ID of the generation job
 * @param maxAttempts Maximum number of polling attempts
 * @param intervalMs Time in milliseconds between polling attempts
 */
export async function waitForVideoGeneration(
  jobId: string,
  maxAttempts = 60,
  intervalMs = 5000
): Promise<RunwayVideoStatusResponse> {
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    const status = await getVideoGenerationStatus(jobId);
    
    if (status.status === 'complete' || status.status === 'failed') {
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
  options?: RunwayVideoGenerationOptions
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
