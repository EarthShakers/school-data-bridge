import { Queue } from "bullmq";
import { redisConnection, QUEUE_NAME } from "./connection";

// 创建同步队列
export const syncQueue = new Queue(QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3, // 失败重试次数
    backoff: {
      type: "exponential",
      delay: 5000, // 初始延迟 5 秒
    },
    removeOnComplete: true, // 成功后移除任务，节省 Redis 内存
    removeOnFail: { age: 24 * 3600 }, // 失败任务保留 24 小时供排查
  },
});

/**
 * 添加单次同步任务
 */
export async function addSyncJob(tenantId: string, entityType: string, priority = 10) {
  const jobId = `${tenantId}:${entityType}`;
  await syncQueue.add(
    "sync-task",
    { tenantId, entityType },
    { jobId, priority }
  );
  console.log(`[Queue] 📥 Job added: ${jobId}`);
}

