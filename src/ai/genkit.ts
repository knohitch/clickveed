
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

// The Google AI API key is now managed via the admin settings context,
// so we no longer check for it in the environment variables here.
// We rely on the UI to prevent calls if the key is not set.

export const ai = genkit({
  plugins: [
    googleAI({
      // The API key will be passed dynamically in server actions from the admin settings context.
      // This allows the admin to set the key without restarting the server.
    }),
  ],
});
