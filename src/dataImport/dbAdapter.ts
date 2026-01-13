import { v4 as uuidv4 } from "uuid";
import knex, { Knex } from "knex";
import { SchoolConfig, DataEnvelope } from "../types";

/**
 * 数据库连接池管理器 (静态缓存)
 * 🔧 Next.js 单例模式：防止 HMR 导致连接池泄漏
 */
const globalForDbManager = global as unknown as {
  dbConnections: Map<string, Knex>;
};

if (!globalForDbManager.dbConnections) {
  globalForDbManager.dbConnections = new Map();
}

class DbConnectionManager {
  private static get connections() {
    return globalForDbManager.dbConnections;
  }

  /**
   * 获取或创建一个连接池
   */
  static async getConnection(config: SchoolConfig): Promise<Knex> {
    const { dataSource, tenantId } = config;
    if (dataSource.type !== "db") throw new Error("Invalid dataSource type");

    const {
      dbType,
      connectionString,
      host,
      port,
      user,
      password,
      database,
      sid,
    } = dataSource.config;

    // 构造缓存 Key：核心连接参数 (去掉 tenantId，让共享 DB 的学校复用连接池)
    const cacheKey = `${dbType}:${connectionString || host}:${port}:${user}:${
      database || sid
    }`;

    if (this.connections.has(cacheKey)) {
      // console.log(`[DbManager] ♻️ Reusing connection for ${tenantId}`);
      return this.connections.get(cacheKey)!;
    }

    console.log(
      `[DbManager] 🆕 Creating new connection pool for ${tenantId} (${dbType})`
    );

    // 映射 DB 类型到 knex 客户端
    const clientMap: Record<string, string> = {
      mysql: "mysql2",
      postgresql: "pg",
      oracle: "oracledb",
      sqlserver: "tedious",
    };
    const client = clientMap[dbType] || dbType;

    // 构造 Knex 连接配置
    let knexConnection: any;
    if (connectionString) {
      knexConnection = connectionString;
    } else {
      knexConnection = {
        host,
        port: Number(port),
        user,
        password,
        database,
      };
      if (dbType === "postgresql") {
        knexConnection.ssl = { rejectUnauthorized: false };
      }
      if (dbType === "oracle" && sid) {
        knexConnection.connectString = `${host}:${port}:${sid}`;
      }
    }

    const db = knex({
      client,
      connection: knexConnection,
      pool: {
        min: 0,
        max: 3, // 👈 下调到 3，减轻数据库负担。一个同步任务通常只需要 1 个连接。
        acquireTimeoutMillis: 60000, // 👈 增加到 60 秒，给慢查询更多排队时间
        idleTimeoutMillis: 30000, // 闲置 30 秒释放
        reapIntervalMillis: 1000,
      },
    });

    this.connections.set(cacheKey, db);
    return db;
  }

  /**
   * 销毁所有连接（通常在进程退出时调用）
   */
  static async destroyAll() {
    for (const [key, db] of this.connections.entries()) {
      await db.destroy();
    }
    this.connections.clear();
  }
}

/**
 * DB 适配器：从数据库抓取数据
 */
export async function fetchFromDb(config: SchoolConfig): Promise<DataEnvelope> {
  if (config.dataSource.type !== "db") {
    throw new Error("[DbAdapter] Invalid dataSource type");
  }

  const { dataSource, tenantId, entityType } = config;
  const { viewName, sql, modelName } = dataSource.config;
  const traceId = uuidv4();

  // 1. 获取（或复用）连接池
  const db = await DbConnectionManager.getConnection(config);

  try {
    let rawData: any[];

    const selectFields = config.fieldMap
      .map((fm) => fm.sourceField)
      .filter((f) => !!f);

    const queryFields = selectFields.length > 0 ? selectFields : ["*"];
    const batchSize = dataSource.config.batchSize || 1000;
    const offset = dataSource.config.offset || 0;

    if (viewName) {
      rawData = await db
        .select(queryFields)
        .from(viewName)
        .limit(batchSize)
        .offset(offset)
        .timeout(30000); // 👈 增加 30 秒超时强制释放
    } else if (modelName) {
      rawData = await db
        .select(queryFields)
        .from(modelName)
        .limit(batchSize)
        .offset(offset)
        .timeout(30000);
    } else if (sql) {
      // 🔧 增强：支持 SQL 数组格式，并自动清理末尾分号
      const rawSql = Array.isArray(sql) ? sql.join("\n") : sql;
      const finalSql = rawSql.trim().replace(/;$/, "");

      console.log(`[DbAdapter] 🔍 Executing Raw SQL: ${finalSql}`);
      const result = await db.raw(finalSql).timeout(30000);
      if (Array.isArray(result)) {
        rawData = Array.isArray(result[0]) ? result[0] : result;
      } else {
        rawData =
          result.rows ||
          result.results ||
          (Array.isArray(result) ? result : [result]);
      }
    } else {
      throw new Error(
        "[DbAdapter] Missing query configuration (viewName/sql/modelName)"
      );
    }

    console.log(
      `[DbAdapter] ✅ Fetched ${
        Array.isArray(rawData) ? rawData.length : 0
      } records for ${tenantId}:${entityType}`
    );

    return { traceId, tenantId, rawData };
  } catch (error: any) {
    console.error(
      `[DbAdapter] ❌ Error fetching from ${tenantId}:`,
      error.message
    );
    throw error;
  }
  // ⚠️ 注意：这里不再调用 db.destroy()，由管理器统一维护
}
