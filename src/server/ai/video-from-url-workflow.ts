import { z } from 'zod';

const RequestSchema = z.object({
  url: z.string().url('Invalid URL format'),
  topic: z.string().trim().max(500).optional().default(''),
});

export const VideoFromUrlScriptOutputSchema = z.object({
  script: z.string().describe('The generated video script'),
});

export async function runVideoFromUrlWorkflow(
  body: unknown,
  deps: {
    assertSafeUrl: (url: string) => Promise<URL>;
    fetchUrl: (url: string) => Promise<{
      ok: boolean;
      status: number;
      headers: { get(name: string): string | null };
      text(): Promise<string>;
    }>;
    consumeCredits: () => Promise<{ success: boolean; error?: string }>;
    generateScript: (prompt: string) => Promise<{ output?: { script?: string }; provider?: string; model?: string }>;
  }
) {
  const requestBody = RequestSchema.safeParse(body);
  if (!requestBody.success) {
    return {
      status: 400 as const,
      body: { error: requestBody.error.flatten().fieldErrors.url?.[0] || 'Invalid request body' },
    };
  }

  const { url, topic } = requestBody.data;
  await deps.assertSafeUrl(url);

  const urlResponse = await deps.fetchUrl(url);

  if (!urlResponse.ok) {
    return { status: 400 as const, body: { error: 'Failed to fetch URL content' } };
  }

  const contentType = (urlResponse.headers.get('content-type') || '').toLowerCase();
  const contentLength = Number(urlResponse.headers.get('content-length') || '0');
  if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
    return { status: 400 as const, body: { error: 'Only HTML or text pages are supported' } };
  }
  if (contentLength > 2_000_000) {
    return { status: 400 as const, body: { error: 'Remote page is too large to process safely' } };
  }

  const html = await urlResponse.text();

  const textContent = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .substring(0, 10000);

  if (!textContent.trim()) {
    return { status: 400 as const, body: { error: 'No extractable content found at URL' } };
  }

  const creditResult = await deps.consumeCredits();
  if (!creditResult.success) {
    return { status: 402 as const, body: { error: creditResult.error || 'Insufficient AI credits' } };
  }

  const prompt = `Generate a compelling video script (under 300 words) for content about:
      
      ${textContent}
      
      ${topic ? `Focus on this angle: ${topic}` : ''}
      
      Structure the script with:
      - Hook/Intro (10-15 seconds)
      - Main content with 2-3 key points
      - Call-to-action
      
      Make it engaging and suitable for video format.`;

  const result = await deps.generateScript(prompt);
  const script = result.output?.script;

  if (!script) {
    return { status: 500 as const, body: { error: 'Failed to generate script' } };
  }

  return {
    status: 200 as const,
    body: {
      success: true,
      script,
      wordCount: script.split(/\s+/).length,
      provider: result.provider,
      model: result.model,
    },
  };
}
