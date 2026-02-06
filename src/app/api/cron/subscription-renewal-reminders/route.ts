import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { sendSubscriptionRenewalReminders } from '@/server/services/subscription-service';

export async function POST(request: Request) {
    const authHeader = headers().get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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
