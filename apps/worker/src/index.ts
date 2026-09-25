import { Worker, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import * as dotenv from 'dotenv';
import { processAutoPackJob, AutoPackJobData } from './processor';

dotenv.config();

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

const isProduction = process.env.NODE_ENV === 'production';
const redisUrl = process.env.REDIS_URL || (isProduction ? '' : 'redis://localhost:6379');

if (!redisUrl) {
  throw new Error('CRITICAL PRODUCTION CONFIGURATION ERROR: REDIS_URL environment variable is required in production.');
}
if (isProduction && (redisUrl.includes('localhost') || redisUrl.includes('127.0.0.1'))) {
  throw new Error(
    `CRITICAL SECURITY ERROR: REDIS_URL cannot point to localhost in production. Found: ${redisUrl}. Use remote Redis (rediss://) or Docker internal service (redis://redis:6379).`
  );
}

const isTls = redisUrl.startsWith('rediss://');

console.log('🚛 [CargoFlow Worker] Starting BullMQ 3D Auto-Pack service...');
console.log(`📡 [CargoFlow Worker] Target Redis: ${redisUrl.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}`);

const redisConnection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  tls: isTls ? { rejectUnauthorized: false } : undefined,
  retryStrategy(times) {
    const delay = Math.min(times * 500, 5000);
    console.warn(`⚠️ [CargoFlow Worker] Redis reconnecting in ${delay}ms (attempt ${times})...`);
    return delay;
  },
});

redisConnection.on('connect', () => {
  console.log('✅ [CargoFlow Worker] Successfully connected to Redis instance');
});

redisConnection.on('error', (err) => {
  console.error('❌ [CargoFlow Worker] Redis connection error:', err.message);
});

const worker = new Worker<AutoPackJobData>(
  'auto-pack',
  async (job: Job<AutoPackJobData>) => {
    console.log(`⚙️ [Job ${job.id}] Processing 3D auto-pack for load: ${job.data.loadId}`);
    return processAutoPackJob(job.data, prisma, async (progress, message) => {
      await job.updateProgress({ progress, message });
      console.log(`📊 [Job ${job.id}] ${progress}% — ${message}`);
    });
  },
  {
    connection: redisConnection,
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || '4', 10),
  }
);

worker.on('active', (job: Job) => {
  console.log(`▶️ [Job ${job.id}] Started processing...`);
});

worker.on('completed', (job: Job) => {
  console.log(`✅ [Job ${job.id}] Auto-pack completed successfully!`);
});

worker.on('failed', (job: Job | undefined, err: Error) => {
  console.error(`❌ [Job ${job?.id}] Execution failed: ${err.message}`, err.stack);
});

worker.on('error', (err: Error) => {
  console.error('💥 [CargoFlow Worker] Worker unexpected runtime error:', err.message);
});

// Graceful Shutdown handler
async function handleShutdown(signal: string) {
  console.log(`🛑 [CargoFlow Worker] Received ${signal}. Commencing graceful drain...`);
  try {
    const shutdownTimeout = setTimeout(() => {
      console.error('⚠️ [CargoFlow Worker] Force-closing after 10s shutdown timeout');
      process.exit(1);
    }, 10000);

    await worker.close();
    await redisConnection.quit();
    await prisma.$disconnect();
    clearTimeout(shutdownTimeout);

    console.log('👋 [CargoFlow Worker] All pending jobs drained. Shutdown complete.');
    process.exit(0);
  } catch (err: any) {
    console.error('❌ [CargoFlow Worker] Error during shutdown:', err?.message);
    process.exit(1);
  }
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  console.error('💥 [CargoFlow Worker] Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('💥 [CargoFlow Worker] Uncaught Exception:', err);
  handleShutdown('uncaughtException');
});

