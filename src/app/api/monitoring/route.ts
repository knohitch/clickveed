import { NextResponse } from 'next/server';
import { getBackupStatus } from '@/lib/backup-manager';
import { getResourceStatus } from '@/lib/resource-monitor';
import { initSentry } from '@/lib/sentry.server.config';

/**
 * Monitoring endpoint for comprehensive application status
 */
export async function GET() {
  const startTime = Date.now();
  
  try {
    // Initialize Sentry for monitoring purposes
    initSentry();
    
    // Get system resources
    const resourceStatus = getResourceStatus();
    
    // Get backup status
    const backupStatus = getBackupStatus();
    
    // Calculate response time
    const responseTime = Date.now() - startTime;
    
    const monitoringData = {
      timestamp: new Date().toISOString(),
      responseTime,
      status: 'healthy',
      resources: resourceStatus,
      backup: backupStatus,
      server: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        uptime: process.uptime(),
      }
    };
    
    return NextResponse.json(monitoringData);
  } catch (error) {
    console.error('Monitoring endpoint error:', error);
    return NextResponse.json(
      { 
        error: 'Monitoring endpoint failed',
        message: (error as Error).message
      },
      { status: 500 }
    );
  }
}
