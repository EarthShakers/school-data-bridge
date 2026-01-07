import knex from "knex";

// 导出元数据库连接
export const metadataDb = knex({
  client: "mysql2",
  connection: "mysql://root:hyt123456@120.46.13.170:3306/school_data_bridge",
  pool: { min: 0, max: 5 },
});
