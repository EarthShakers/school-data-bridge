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
      min: 2,
      max: 50, // 👈 进一步增加，确保并发日志写入不堵塞
      acquireTimeoutMillis: 60000,
      idleTimeoutMillis: 30000,
      reapIntervalMillis: 1000,
    },
  });
}

export const metadataDb = globalForKnex.metadataDb;
