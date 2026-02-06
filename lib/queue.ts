'use server';

import IORedis from 'ioredis';
import { Queue, Worker, Job } from 'bullmq';

// Check if Redis URL is available
const redisUrl = process.env.REDIS_URL;

// Create Redis connection only if Redis URL is available
let redisConnection: IORedis | null = null;
if (redisUrl) {
  redisConnection = new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    lazyConnect: true,
  });
}

// Create queue only if Redis is available
let aiQueueInstance: Queue | null = null;
if (redisUrl && redisConnection) {
  aiQueueInstance = new Queue('ai-tasks', { connection: redisConnection });
}

export const aiQueue = aiQueueInstance;

// Function to add a job to the queue
export async function addAITask(name: string, data: any, opts?: any) {
  if (!aiQueue) {
    console.warn('⚠️  Redis not configured. Cannot add AI task to queue.');
    return null;
  }
  return aiQueue.add(name, data, opts);
}

// Create worker only if Redis is available
let aiWorkerInstance: Worker | null = null;
if (redisUrl && redisConnection) {
  aiWorkerInstance = new Worker('ai-tasks', async (job: Job) => {
    const { name, data } = job;
    console.log(`Processing AI task: ${name} with data:`, data);

    try {
      // Example: Handle video generation job
      if (name === 'generate-video') {
        // Import and call the flow here
        const { generatePipelineVideo } = await import('@/server/ai/flows/video-pipeline');
        const result = await generatePipelineVideo(data.input);
        return result;
      }

      // Add other task types as needed (e.g., 'generate-voice', 'repurpose-content')
      throw new Error(`Unknown AI task type: ${name}`);
    } catch (error) {
      console.error(`AI task failed: ${name}`, error);
      throw error; // BullMQ will retry or mark as failed
    }
  }, { connection: redisConnection });
}

export const aiWorker = aiWorkerInstance;

// Export default for compatibility
export default aiQueueInstance;
