import { NextResponse } from 'next/server';
import { sendSubscriptionRenewalReminders } from '@/server/services/subscription-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
        console.error('[Cron] CRON_SECRET is not configured for subscription renewal reminders');
        return NextResponse.json({ error: 'Cron is not configured' }, { status: 503 });
    }

    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log("Running Subscription Renewal Reminders Cron Job...");
    
    try {
        const result = await sendSubscriptionRenewalReminders();
        return NextResponse.json(result);
    } catch (error) {
        console.error("Error in subscription renewal reminders cron job:", error);
        return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
}
