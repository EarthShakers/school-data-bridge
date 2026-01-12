import IORedis from "ioredis";

// Redis 连接配置
export const redisConfig = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  connectTimeout: 10000,
  enableReadyCheck: true,
  enableOfflineQueue: false,
  retryStrategy(times: number) {
    if (times > 3) return null;
    return Math.min(times * 500, 2000);
  },
};

console.log(
  `[Redis] 📡 Attempting connection using config: ${redisConfig.host}:${
    redisConfig.port
  } (Source: ${process.env.REDIS_HOST ? "ENV" : "Default"})`
);

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
// 优先级：环境变量手动指定 > 环境标识后缀 > 默认 dev 后缀
const getQueueName = () => {
  if (process.env.CUSTOM_QUEUE_NAME) return process.env.CUSTOM_QUEUE_NAME;
  const suffix =
    process.env.APP_ENV ||
    (process.env.NODE_ENV === "production" ? "prod" : "dev");
  return `school-data-sync-${suffix}`;
};

export const QUEUE_NAME = getQueueName();
