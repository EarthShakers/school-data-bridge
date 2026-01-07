import { v4 as uuidv4 } from "uuid";
import knex, { Knex } from "knex";
import { SchoolConfig, DataEnvelope } from "../types";
import { studentMockData, teacherMockData } from "../../mock";

/**
 * DB 适配器：从数据库抓取数据
 *
 * 在配置中可以通过 dataSource.config 定义查询方式：
 * - viewName: 视图名称（推荐，逻辑在 DB 端闭环）
 * - sql: 直接执行的 SQL 语句
 * - modelName: 模型名称（对应表名）
 */
export async function fetchFromDb(config: SchoolConfig): Promise<DataEnvelope> {
  if (config.dataSource.type !== "db") {
    throw new Error("[DbAdapter] Invalid dataSource type");
  }

  const { dataSource, tenantId, entityType } = config;
  const { dbType, viewName, sql, modelName, connectionString } =
    dataSource.config;

  const traceId = uuidv4();

  console.log(
    `[DbAdapter] 🚀 Fetching from DB for ${tenantId || "Unknown"}:${
      entityType || "Unknown"
    }. Mode: ${viewName ? "View" : sql ? "SQL" : "Model"}`
  );

  // 🧪 Mock 逻辑判断：只有当连接字符串明确为空时才使用 Mock
  const isMock = !connectionString || connectionString === "";

  if (isMock) {
    console.log(
      `[DbAdapter] 🧪 Using mock data. Reason: Empty connection string`
    );
    return {
      traceId,
      tenantId,
      rawData:
        config.entityType === "student" ? studentMockData : teacherMockData,
    };
  }

  console.log(
    `[DbAdapter] 🔌 Attempting real DB connection to ${dbType} for ${tenantId}`
  );

  // 映射 DB 类型到 knex 客户端
  const clientMap: Record<string, string> = {
    mysql: "mysql2",
    postgresql: "pg",
    oracle: "oracledb",
    sqlserver: "tedious",
  };

  const client = clientMap[dbType] || dbType;

  // 创建临时连接池
  const db = knex({
    client,
    connection: connectionString,
    // 对于这类同步工具，不需要常驻连接池，抓完即走
    pool: { min: 0, max: 1 },
  });

  try {
    let rawData: any[];

    // 从 fieldMap 中提取所有 sourceField，显式查询核心字段
    const selectFields = config.fieldMap
      .map((fm) => fm.sourceField)
      .filter((f) => !!f);

    const queryFields = selectFields.length > 0 ? selectFields : ["*"];

    if (selectFields.length > 0) {
      console.log(
        `[DbAdapter] 🔍 Explicitly selecting fields: ${selectFields.join(", ")}`
      );
    } else {
      console.warn(
        "[DbAdapter] ⚠️ No field mapping found, falling back to select('*')"
      );
    }

    const batchSize = dataSource.config.batchSize || 1000;
    const offset = dataSource.config.offset || 0;

    if (viewName) {
      const query = db
        .select(queryFields)
        .from(viewName)
        .limit(batchSize)
        .offset(offset);
      console.log(`[DbAdapter] 🔍 Executing Query: ${query.toString()}`);
      rawData = await query;
    } else if (modelName) {
      const query = db
        .select(queryFields)
        .from(modelName)
        .limit(batchSize)
        .offset(offset);
      console.log(`[DbAdapter] 🔍 Executing Query: ${query.toString()}`);
      rawData = await query;
    } else if (sql) {
      // 原生 SQL 模式
      const result = await db.raw(sql);
      rawData = Array.isArray(result) ? result[0] : result.rows || result;
    } else {
      throw new Error(
        "[DbAdapter] At least one of viewName, modelName, or sql must be provided"
      );
    }

    console.log(
      `[DbAdapter] ✅ Successfully fetched ${rawData.length} records from DB.`
    );

    return {
      traceId,
      tenantId,
      rawData,
    };
  } catch (error: any) {
    console.error(
      `[DbAdapter] Failed to fetch from DB for ${tenantId}:`,
      error.message
    );
    throw error;
  } finally {
    // 必须关闭连接，否则进程不会退出
    await db.destroy();
  }
}
