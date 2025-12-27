
import { NextResponse } from 'next/server';
import { upsertConnection } from '@/server/actions/social-actions';
import { auth } from '@/auth';

/**
 * Handles the final step of the OAuth 2.0 flow for Threads.
 * Meta/Instagram redirects the user here after they authorize the app.
 * This route exchanges the temporary code for a long-lived access token.
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'User is not authenticated.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(new URL('/dashboard/social-suite/integrations?error=Authorization+code+not+provided.', request.url));
  }

  try {
    const userId = session.user.id;

    // SIMULATION: Exchange code for an access token with Threads' API (via Instagram Graph API)
    const accessToken = `simulated_threads_token_for_${userId}_${Date.now()}`;
    console.log(`Successfully received code and generated a simulated Threads access token for user ${userId}.`);

    const accountName = 'Threads Account';

    await upsertConnection({
        userId,
        platform: 'threads',
        accessToken: accessToken,
        name: accountName,
        refreshToken: null,
        expiresAt: new Date(Date.now() + 3600 * 1000 * 24 * 60), // Simulate a 60-day token
    });

    // Redirect the user back to the integrations page with a success message
    return NextResponse.redirect(new URL('/dashboard/social-suite/integrations?connected=threads', request.url));

  } catch (error) {
    console.error('Threads connection error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during connection.';
    return NextResponse.redirect(new URL(`/dashboard/social-suite/integrations?error=${encodeURIComponent(errorMessage)}`, request.url));
  }
}
