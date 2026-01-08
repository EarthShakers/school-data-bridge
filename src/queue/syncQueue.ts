import { Queue } from "bullmq";
import { redisConnection, QUEUE_NAME } from "./connection";
import { EntityType } from "../types";

// 创建同步队列
export const syncQueue = new Queue(QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3, // 失败重试次数
    backoff: {
      type: "exponential",
      delay: 5000, // 初始延迟 5 秒
    },
    removeOnComplete: {
      count: 100, // 最近 100 条成功任务保留在 Redis 中，以便在任务列表展示
      age: 3600, // 最长保留 1 小时
    },
    removeOnFail: {
      count: 500, // 最近 500 条失败任务保留
      age: 24 * 3600, // 失败任务保留 24 小时
    },
  },
});

/**
 * 添加单次同步任务
 */
export async function addSyncJob(
  tenantId: string,
  entityType: EntityType,
  environment: string = "dev",
  priority = 10,
  traceId?: string // 新增：可选的 Trace ID
) {
  const timestamp = Date.now();
  const jobId = `manual-${tenantId}-${entityType}-${timestamp}`;
  await syncQueue.add(
    "sync-task",
    {
      tenantId,
      entityType,
      environment,
      traceId: traceId || `task_${timestamp}`, // 如果没传则生成一个
    },
    { jobId, priority }
  );
  console.log(`[Queue] 📥 Job added: ${jobId} (Env: ${environment})`);
}
