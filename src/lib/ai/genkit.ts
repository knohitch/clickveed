

import {genkit, type GenkitErrorCode, type GenkitError, configureGenkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import { getAdminSettings } from '@/server/actions/admin-actions';


// This function will be called once to configure Genkit with all possible plugins.
// The API Service Manager will then select which pre-configured model to use.
export async function configureAi() {
    const { apiKeys } = await getAdminSettings();
    const plugins = [];

    if (apiKeys.gemini) {
        plugins.push(googleAI({ apiKey: apiKeys.gemini }));
    }
    // Add other providers here, e.g.:
    // if (apiKeys.openai) {
    //     plugins.push(openai({ apiKey: apiKeys.openai }));
    // }

    configureGenkit({
        plugins,
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
}


// Call configureAi() right away. Note that this runs when the module is imported on the server.
// It relies on AdminSettings being available, which should be the case in a server environment.
configureAi();

// Export the globally configured ai object.
// This is now an alias for the main genkit export, as configuration is handled above.
export const ai = genkit;

    