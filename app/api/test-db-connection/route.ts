import { NextResponse } from "next/server";
import knex from "knex";
import { Client as PgClient } from "pg";

export async function POST(request: Request) {
  let db: any = null;
  let pgClient: PgClient | null = null;
  try {
    const { dbType, connection } = await request.json();

    if (!dbType || !connection) {
      return NextResponse.json({ error: "参数缺失" }, { status: 400 });
    }

    const isString = typeof connection === "string";

    // --- 针对 PostgreSQL 的驱动测试 ---
    if (dbType === "postgresql") {
      pgClient = new PgClient(
        isString
          ? {
              connectionString: connection,
              ssl: { rejectUnauthorized: false },
              connectionTimeoutMillis: 10000,
            }
          : {
              host: connection.host,
              port: connection.port,
              user: connection.user,
              password: connection.password,
              database: connection.database,
              ssl: { rejectUnauthorized: false },
              connectionTimeoutMillis: 10000,
            }
      );

      try {
        await pgClient.connect();
        await pgClient.query("SELECT 1");
        return NextResponse.json({
          success: true,
          message: "PostgreSQL 连接成功！",
        });
      } finally {
        await pgClient.end();
      }
    }

    // --- 针对其他数据库使用 Knex 测试 ---
    const clientMap: Record<string, string> = {
      mysql: "mysql2",
      oracle: "oracledb",
      sqlserver: "tedious",
    };

    db = knex({
      client: clientMap[dbType] || dbType,
      connection: connection,
      acquireConnectionTimeout: 5000, // 缩短超时到 5 秒
      pool: { min: 0, max: 1 }, // 严格限制只用 1 个连接
    });

    let testSql =
      dbType === "oracle" ? "SELECT 1 FROM DUAL" : "SELECT 1 as result";
    await db.raw(testSql).timeout(5000); // 执行查询也要有超时

    return NextResponse.json({ success: true, message: "数据库连接成功！" });
  } catch (error: any) {
    console.error("[TestDB] Connection failed:", error.code, error.message);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  } finally {
    if (db) await db.destroy();
  }
}
