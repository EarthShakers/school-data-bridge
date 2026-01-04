import IORedis from "ioredis";

// Redis 连接配置
export const redisConfig = {
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null, // BullMQ 必需配置
};

// 共享的 Redis 实例
export const redisConnection = new IORedis(redisConfig);

// 队列名称常量
export const QUEUE_NAME = "school-data-sync";

