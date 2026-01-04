import { Worker, Job } from "bullmq";
import { redisConnection, QUEUE_NAME } from "./connection";
import { runSyncTask } from "../core/executor";

// 创建 Worker 处理同步任务
export const syncWorker = new Worker(
  QUEUE_NAME,
  async (job: Job) => {
    const { tenantId, entityType } = job.data;
    console.log(`[Worker] 🛠 Processing Job ${job.id}: ${tenantId}-${entityType}`);
    
    // 执行实际的同步逻辑
    return await runSyncTask(tenantId, entityType);
  },
  {
    connection: redisConnection,
    concurrency: 2, // 同时处理的任务数，可根据服务器性能调整
  }
);

syncWorker.on("completed", (job) => {
  console.log(`[Worker] ✅ Job ${job.id} completed!`);
});

syncWorker.on("failed", (job, err) => {
  console.error(`[Worker] ❌ Job ${job?.id} failed: ${err.message}`);
});

console.log(`[Worker] 🚀 Sync Worker started and waiting for jobs...`);

