
'use server';

/**
 * @fileOverview An AI agent that generates automation workflows for n8n or Make.com.
 *
 * - generateAutomationWorkflow - A function that handles the workflow generation process.
 * - GenerateAutomationWorkflowInput - The input type for the function.
 * - GenerateAutomationWorkflowOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { generateWithProvider } from '../api-service-manager';

const GenerateAutomationWorkflowInputSchema = z.object({
  prompt: z
    .string()
    .describe('A natural language description of the desired automation workflow.'),
  platform: z
    .enum(['n8n', 'Make.com'])
    .describe('The target automation platform.'),
});
export type GenerateAutomationWorkflowInput = z.infer<
  typeof GenerateAutomationWorkflowInputSchema
>;

const GenerateAutomationWorkflowOutputSchema = z.object({
  workflow: z
    .any()
    .describe(
      'A JSON representation of the generated workflow, compatible with the specified platform.'
    ),
});
export type GenerateAutomationWorkflowOutput = z.infer<
  typeof GenerateAutomationWorkflowOutputSchema
>;

export async function generateAutomationWorkflow(
  input: GenerateAutomationWorkflowInput
): Promise<GenerateAutomationWorkflowOutput> {
  return generateAutomationWorkflowFlow(input);
}

const getPromptForPlatform = (platform: 'n8n' | 'Make.com') => {
  const commonInstructions = `
Analyze the user's request to identify triggers, actions, and the data flow between them.
The trigger will often be related to an event in "ClickVid Pro", our video creation app.
Actions might include posting to social media (Facebook, Instagram, YouTube), sending emails, transcribing video, etc.
If the request includes a schedule (e.g., "every Friday at 3 PM"), you must include a scheduling or cron trigger.

User Request: "{{{prompt}}}"

Respond ONLY with the valid JSON structure for the ${platform} workflow. Do not include any explanatory text, markdown code blocks, or comments.
  `;

  if (platform === 'n8n') {
    return `You are an expert in building automations for n8n.
Your task is to convert a user's natural language request into a valid n8n JSON workflow.
The final JSON should be an object with a "nodes" array and a "connections" object.

${commonInstructions}

Example ClickVid Trigger Node for n8n:
{
  "parameters": { "events": ["video.ready"] },
  "name": "ClickVid Pro Trigger",
  "type": "n8n-nodes-base.webhook",
  "typeVersion": 1,
  "position": [ 800, 200 ],
  "webhookId": "your-webhook-id-here"
}`;
  }

  if (platform === 'Make.com') {
    return `You are an expert in building automations for Make.com.
Your task is to convert a user's natural language request into a valid Make.com scenario blueprint JSON.
The final JSON should be an object with a "name", "flow" (an array of modules), "metadata", and other relevant blueprint properties.

${commonInstructions}

Example ClickVid Trigger Module for Make.com:
{
  "id": 1,
  "module": "webhooks:receive",
  "version": 1,
  "parameters": {},
  "metadata": {
    "designer": { "x": 0, "y": 0 },
    "hook": { "id": "your-webhook-id-here" }
  }
}`;
  }

  throw new Error('Invalid platform specified.');
};


const generateAutomationWorkflowFlow = ai.defineFlow(
  {
    name: 'generateAutomationWorkflowFlow',
    inputSchema: GenerateAutomationWorkflowInputSchema,
    outputSchema: GenerateAutomationWorkflowOutputSchema,
  },
  async ({ prompt: userPrompt, platform }) => {
    const promptText = getPromptForPlatform(platform);

    const messages = [
      {
        role: 'system' as const,
        content: [{ text: promptText }],
      },
      {
        role: 'user' as const,
        content: [{ text: userPrompt }],
      },
    ];

    // Use type assertion to handle the union type returned by generateWithProvider
    const response: any = await generateWithProvider({ messages });
    
    // Extract content from the response - matches pattern used in other files
    let content = '';
    
    // Check if response has output property (Genkit format)
    if (response.output) {
      // For Genkit responses, we need to stringify the output to get the JSON
      content = JSON.stringify(response.output);
    } 
    // Check if response has result property (OpenAI format)
    else if (response.result?.content?.[0]?.text) {
      content = response.result.content[0].text;
    }
    
    if (!content) {
      throw new Error('Failed to generate a valid workflow from the prompt.');
    }
    
    try {
      // Parse the JSON response to get the workflow object
      // If content is already a stringified object, we parse it
      // If it's a JSON string from the AI, we also parse it
      const workflow = typeof content === 'string' ? JSON.parse(content) : content;
      
      if (!workflow) {
        throw new Error('Failed to generate a valid workflow from the prompt.');
      }
      
      return { workflow };
    } catch (error) {
      throw new Error('Failed to parse the generated workflow JSON.');
    }
  }
);
