
import {genkit, type GenkitErrorCode, type GenkitError} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

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
  // This allows us to handle errors more gracefully in the UI.
  // We can check `error.name` to see if it's a GenkitError.
  errorHandler: (err: GenkitError) => {
    // By default Genkit will log the error to the console.
    // We can add additional error handling here, like sending to a logging service.
    
    // For simplicity, we just re-throw the error to be caught by the server action.
    throw {
        name: err.name,
        // The `info` property contains the original error code and message from the provider.
        // It's useful for debugging.
        message: err.info?.message || err.message,
        // The `reason` property is a more human-readable description of the error.
        reason: err.reason || 'An unknown error occurred.',
    };
  }
});
