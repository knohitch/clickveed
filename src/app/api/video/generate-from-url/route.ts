import { NextResponse } from 'next/server';
import { createRateLimit } from '@/lib/rate-limit';
import { z } from 'zod';
import { generateStructuredOutput } from '@/lib/ai/api-service-manager';

// Rate limiting: 5 requests per minute for video generation
const rateLimiter = createRateLimit({
  windowMs: 60 * 1000,
  maxRequests: 5,
  message: 'Too many video generation requests. Please try again in a minute.'
});

const ScriptOutputSchema = z.object({
  script: z.string().describe('The generated video script')
});

export async function POST(request: Request) {
  try {
    const rateLimitResponse = rateLimiter(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }

    const { url, topic } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    try {
      const urlResponse = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      if (!urlResponse.ok) {
        return NextResponse.json({ error: 'Failed to fetch URL content' }, { status: 400 });
      }

      const html = await urlResponse.text();

      const textContent = html
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .substring(0, 10000);

      if (!textContent.trim()) {
        return NextResponse.json({ error: 'No extractable content found at URL' }, { status: 400 });
      }

      const prompt = `Generate a compelling video script (under 300 words) for content about:
      
      ${textContent}
      
      ${topic ? `Focus on this angle: ${topic}` : ''}
      
      Structure the script with:
      - Hook/Intro (10-15 seconds)
      - Main content with 2-3 key points
      - Call-to-action
      
      Make it engaging and suitable for video format.`;

      // Use generateStructuredOutput which properly handles model selection
      const result = await generateStructuredOutput(prompt, ScriptOutputSchema);

      const script = result.output?.script;

      if (!script) {
        return NextResponse.json({ error: 'Failed to generate script' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        script,
        wordCount: script.split(/\s+/).length,
        provider: result.provider,
        model: result.model
      });

    } catch (error) {
      console.error('Error generating script from URL:', error);
      return NextResponse.json(
        { error: 'Failed to generate script' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
