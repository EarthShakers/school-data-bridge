import knex, { Knex } from "knex";

// 🔧 Next.js 单例模式：防止开发模式下热更新导致连接泄漏
const globalForKnex = global as unknown as { metadataDb: Knex };

export const metadataDb =
  globalForKnex.metadataDb ||
  knex({
    client: "mysql2",
    connection:
      process.env.METADATA_DB_URL ||
      "mysql://root:hyt123456@120.46.13.170:3306/school_data_bridge",
    pool: {
      min: 0,
      max: 10, // 👈 调低最大连接数，防止占用过多数据库资源
      acquireTimeoutMillis: 60000, // 👈 延长等待时间
      idleTimeoutMillis: 30000,
      reapIntervalMillis: 1000,
    },
  });

if (process.env.NODE_ENV !== "production") {
  globalForKnex.metadataDb = metadataDb;
}
