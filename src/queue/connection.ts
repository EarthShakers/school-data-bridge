import IORedis from "ioredis";

// Redis 连接配置
export const redisConfig = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  connectTimeout: 10000, // 👈 延长到 10 秒
  enableReadyCheck: true,
  enableOfflineQueue: false, // 👈 核心：连不上立即报错，不要 pending 几十秒
  retryStrategy(times: number) {
    if (times > 3) return null; // 👈 最多重试 3 次，失败就彻底放弃，触发前端报错
    return Math.min(times * 500, 2000);
  },
};

// 🔧 Next.js 单例模式优化：增加状态校验
const globalForRedis = global as unknown as { redisConnection?: IORedis };

if (globalForRedis.redisConnection) {
  // 如果现有的连接配置和当前环境不一致（比如改了 .env），强制断开旧连接
  const current = globalForRedis.redisConnection.options;
  if (current.host !== redisConfig.host || current.port !== redisConfig.port) {
    console.log("[Redis] 🔄 Config changed, disconnecting old instance...");
    globalForRedis.redisConnection.disconnect();
    delete globalForRedis.redisConnection;
  }
}

export const redisConnection =
  globalForRedis.redisConnection || new IORedis(redisConfig);

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redisConnection = redisConnection;
}

redisConnection.on("error", (err) => {
  console.error(`[Redis] ❌ Connection Error: ${err.message}`);
});

redisConnection.on("connect", () => {
  console.log(
    `[Redis] 🔌 Connected to ${redisConfig.host}:${redisConfig.port}`
  );
});

// 队列名称常量
export const QUEUE_NAME = "school-data-sync";
