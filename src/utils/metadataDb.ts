import knex, { Knex } from "knex";

// 🔧 单例模式：防止热更新或多次导入导致连接池泄漏
const globalForKnex = global as unknown as { metadataDb?: Knex };

if (!globalForKnex.metadataDb) {
  console.log("[MetadataDB] 🔌 Initializing Knex connection pool...");
  globalForKnex.metadataDb = knex({
    client: "mysql2",
    connection:
      process.env.METADATA_DB_URL ||
      "mysql://root:hyt123456@120.46.13.170:3306/school_data_bridge",
    pool: {
      min: 2, // 保持最少 2 个连接，提高响应速度
      max: 20, // 👈 适当增加，防止任务并发时耗尽
      acquireTimeoutMillis: 60000,
      idleTimeoutMillis: 30000,
      reapIntervalMillis: 1000,
    },
  });
}

export const metadataDb = globalForKnex.metadataDb;
