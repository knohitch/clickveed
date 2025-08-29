// /src/app/api/health/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
    try {
        // Check database connection
        await prisma.$queryRaw`SELECT 1`;
        
        // In the future, you can add checks for Redis/queue liveness here.
        // const queueIsAlive = await checkQueueStatus();

        return NextResponse.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            checks: {
                database: 'connected',
                // queue: queueIsAlive ? 'connected' : 'disconnected',
            }
        });

    } catch (error) {
        console.error("Health check failed:", error);
        return NextResponse.json({
            status: 'error',
            timestamp: new Date().toISOString(),
            error: 'One or more services are unhealthy.',
            details: (error as Error).message
        }, { status: 503 });
    }
}
