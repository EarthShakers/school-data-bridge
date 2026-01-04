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

  const { dataSource, tenantId } = config;
  const {
    dbType,
    viewName,
    sql,
    modelName,
    connectionString,
    // 也可以扩展针对不同 DB 类型的配置
  } = dataSource.config;

  const traceId = uuidv4();

  console.log(
    `[DbAdapter] 🚀 Fetching from DB for ${tenantId}. Mode: ${
      viewName ? "View" : sql ? "SQL" : "Model"
    }`
  );

  // 🧪 Mock 逻辑：如果没有真实连接配置，返回 Mock 数据
  if (!connectionString || connectionString.includes("localhost")) {
    console.log(
      `[DbAdapter] 🧪 Using mock data for DB source (${config.entityType})`
    );

    return {
      traceId,
      tenantId,
      rawData:
        config.entityType === "student" ? studentMockData : teacherMockData,
    };
  }

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

    // 💡 优化：从 fieldMap 中提取所有 sourceField，显式查询核心字段
    // 这样做可以避免 select * 带来的性能开销、字段不可控及合规风险
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

    if (viewName) {
      // 视图模式：显式选择字段
      rawData = await db.select(queryFields).from(viewName);
    } else if (modelName) {
      // 模型/表名模式：显式选择字段
      rawData = await db.select(queryFields).from(modelName);
    } else if (sql) {
      // 原生 SQL 模式：注意，原生 SQL 建议用户在 SQL 语句中显式写明字段
      const result = await db.raw(sql);
      // 不同数据库驱动返回的 raw 结构不同，这里需要兼容处理
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
