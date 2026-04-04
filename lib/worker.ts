// This file is used to start the BullMQ worker process
// It should be run with: npm run worker

async function emitAlert(payload: {
  category: 'queue' | 'ai';
  severity: 'warning' | 'critical';
  event: string;
  message: string;
  metadata?: Record<string, unknown>;
  error?: Error;
}) {
  const { sendOperationalAlert } = await import('../src/lib/monitoring/alerts.js');
  await sendOperationalAlert(payload);
}

import('./queue.js')
  .then(({ aiWorker }) => {
    console.log('Starting BullMQ worker...');

    if (!aiWorker) {
      console.warn('[Worker] No Redis connection configured. Worker not started.');
      void emitAlert({
        category: 'queue',
        severity: 'critical',
        event: 'worker_not_started',
        message: 'BullMQ worker failed to start because Redis is not configured.',
      });
      process.exit(1);
    }

    aiWorker.on('ready', () => {
      console.log('[Worker] BullMQ worker is ready');
    });

    aiWorker.on('error', (err) => {
      console.error('[Worker] BullMQ worker error:', err);
      void emitAlert({
        category: 'queue',
        severity: 'critical',
        event: 'worker_runtime_error',
        message: 'BullMQ worker encountered a runtime error.',
        error: err instanceof Error ? err : new Error(String(err)),
      });
      process.exit(1);
    });

    aiWorker.on('failed', (job, err) => {
      console.error(`[Worker] Job ${job?.id} failed with error:`, err);
      void emitAlert({
        category: 'ai',
        severity: 'critical',
        event: 'worker_job_failed',
        message: `BullMQ job ${job?.id || 'unknown'} failed.`,
        metadata: {
          jobId: job?.id,
          queueName: job?.queueName,
          jobName: job?.name,
        },
        error: err instanceof Error ? err : new Error(String(err)),
      });
    });

    aiWorker.on('completed', (job, result) => {
      console.log(`[Worker] Job ${job?.id} completed with result:`, result);
    });

    process.on('SIGTERM', async () => {
      console.log('[Worker] Shutting down worker...');
      await aiWorker.close();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log('[Worker] Shutting down worker...');
      await aiWorker.close();
      process.exit(0);
    });
  })
  .catch((err) => {
    console.error('[Worker] Failed to initialize worker:', err);
    emitAlert({
      category: 'queue',
      severity: 'critical',
      event: 'worker_initialization_failed',
      message: 'BullMQ worker failed to initialize.',
      error: err instanceof Error ? err : new Error(String(err)),
    }).finally(() => {
      process.exit(1);
    });
  });
