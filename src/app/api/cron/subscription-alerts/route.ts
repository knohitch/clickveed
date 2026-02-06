import { NextResponse } from 'next/server';
import { checkSubscriptionsForExpirationAlerts } from '@/server/services/notification-service';

// This endpoint should be called by a cron job (e.g., daily)
// Configure in Vercel: vercel cron "0 9 * * *" https://your-domain.com/api/cron/subscription-alerts
// Or use any external cron service

export async function GET(request: Request) {
  // Verify cron secret for security
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('[Cron] Subscription alert check triggered');
    const result = await checkSubscriptionsForExpirationAlerts();
    return NextResponse.json({ 
      success: true, 
      message: `Completed. Sent ${result.alertsSent} alerts.`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Cron] Subscription alert check failed:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Subscription alert check failed' 
    }, { status: 500 });
  }
}
