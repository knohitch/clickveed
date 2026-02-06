

import {genkit, type GenkitError} from 'genkit';
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

    genkit({
        plugins,
    });
}


// Call configureAi() right away. Note that this runs when the module is imported on the server.
// It relies on AdminSettings being available, which should be the case in a server environment.
configureAi();

// Export the globally configured ai object.
// This is now an alias for the main genkit export, as configuration is handled above.
export const ai = genkit;
