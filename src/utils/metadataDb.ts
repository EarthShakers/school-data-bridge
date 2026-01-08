import knex from "knex";

// 导出元数据库连接
export const metadataDb = knex({
  client: "mysql2",
  connection:
    process.env.METADATA_DB_URL ||
    "mysql://root:hyt123456@120.46.13.170:3306/school_data_bridge",
  pool: {
    min: 2,
    max: 20,
    acquireTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
    reapIntervalMillis: 1000,
    createTimeoutMillis: 30000,
    propagateCreateError: false,
  },
});
