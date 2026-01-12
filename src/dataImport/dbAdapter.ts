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

    // 构造缓存 Key：租户ID + 核心连接参数
    const cacheKey = `${tenantId}:${dbType}:${
      connectionString || host
    }:${port}:${user}:${database || sid}`;

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
        max: 5, // 👈 为每个学校保留少量长连接
        acquireTimeoutMillis: 60000,
        idleTimeoutMillis: 300000, // 👈 闲置 5 分钟后才真正关闭
      },
      acquireConnectionTimeout: 60000,
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
        .offset(offset);
    } else if (modelName) {
      rawData = await db
        .select(queryFields)
        .from(modelName)
        .limit(batchSize)
        .offset(offset);
    } else if (sql) {
      const result = await db.raw(sql);
      // 兼容不同驱动的返回格式
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
