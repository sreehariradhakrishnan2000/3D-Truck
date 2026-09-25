import { Worker, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import { processAutoPackJob, AutoPackJobData } from './processor';

dotenv.config();

const prisma = new PrismaClient();
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

console.log('🚛 CargoFlow Auto-Pack Worker starting...');
console.log(`Connecting to Redis: ${redisUrl}`);

const worker = new Worker<AutoPackJobData>(
  'auto-pack',
  async (job: Job<AutoPackJobData>) => {
    console.log(`[Job ${job.id}] Processing auto-pack for load ${job.data.loadId}`);
    return processAutoPackJob(job.data, prisma, async (progress, message) => {
      await job.updateProgress({ progress, message });
      console.log(`[Job ${job.id}] ${progress}% - ${message}`);
    });
  },
  {
    connection: {
      url: redisUrl,
    },
    concurrency: 4,
  }
);

worker.on('completed', (job: Job) => {
  console.log(`[Job ${job.id}] Completed successfully!`);
});

worker.on('failed', (job: Job | undefined, err: Error) => {
  console.error(`[Job ${job?.id}] Failed with error: ${err.message}`);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down worker...');
  await worker.close();
  await prisma.$disconnect();
});

