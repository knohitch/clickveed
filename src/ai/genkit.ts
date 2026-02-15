
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import OpenAI from 'openai';

// Try to import other available Genkit plugins
// Note: Not all providers have official Genkit plugins
try {
  // These might not exist, so we'll use try/catch
  // We'll add them as needed
} catch (error) {
  // Silently ignore missing plugins
  console.debug('Some Genkit plugins are not available');
}

// Define types for our message structures
type MessageRole = 'user' | 'model' | 'system' | 'tool';

interface MessageContent {
  text: string;
}

interface GenkitMessage {
  role: MessageRole;
  content: MessageContent[];
}

interface GenerateParams {
  messages: GenkitMessage[];
  model?: string;
  [key: string]: any;
}

// The API keys are now managed via the admin settings context,
// so we no longer check for them in the environment variables here.
// We rely on the UI to prevent calls if the keys are not set.

// This function creates and returns a Genkit instance with the appropriate plugins
export function createGenkitInstance(apiKeys: Record<string, string> = {}) {
  const plugins: any[] = [];
  
  // Add Google AI plugin if API key exists
  if (apiKeys.gemini) {
    plugins.push(
      googleAI({
        apiKey: apiKeys.gemini
      })
    );
  }
  
  // Add OpenAI support through the Genkit API
  // We'll use a custom provider pattern instead of a direct plugin
  // since we don't have an official @genkit-ai/openai package
  
  // Return Genkit instance with configured plugins
  return genkit({
    plugins
  });
}

// Default instance with no API keys - keys will be provided at runtime
export const ai = createGenkitInstance();

// Helper function to create an OpenAI client with the provided API key
export function getOpenAIClient(apiKey: string) {
  if (!apiKey) throw new Error('OpenAI API key is required');
  
  return new OpenAI({
    apiKey: apiKey
  });
}
