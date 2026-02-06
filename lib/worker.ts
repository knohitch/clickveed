// This file is used to start the BullMQ worker process
// It should be run with: npm run worker

// Import the queue module to initialize the worker
import('./queue.js').then(({ aiWorker }) => {
  console.log('Starting BullMQ worker...');
  
  // Check if worker was created
  if (!aiWorker) {
    console.warn('⚠️  No Redis connection configured. Worker not started.');
    process.exit(1);
  }
  
  // Listen for worker events
  aiWorker.on('ready', () => {
    console.log('✅ BullMQ worker is ready');
  });
  
  aiWorker.on('error', (err) => {
    console.error('❌ BullMQ worker error:', err);
    process.exit(1);
  });
  
  aiWorker.on('failed', (job, err) => {
    console.error(`❌ Job ${job?.id} failed with error:`, err);
  });
  
  aiWorker.on('completed', (job, result) => {
    console.log(`✅ Job ${job?.id} completed with result:`, result);
  });
  
  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('🛑 Shutting down worker...');
    await aiWorker.close();
    process.exit(0);
  });
  
  process.on('SIGINT', async () => {
    console.log('🛑 Shutting down worker...');
    await aiWorker.close();
    process.exit(0);
  });
}).catch(err => {
  console.error('Failed to initialize worker:', err);
  process.exit(1);
});
