import { NextResponse } from "next/server";
import knex from "knex";

export async function POST(request: Request) {
  let db: any = null;
  try {
    const { dbType, connectionString } = await request.json();

    if (!dbType || !connectionString) {
      return NextResponse.json({ error: "参数缺失" }, { status: 400 });
    }

    console.log(`[TestDB] Attempting to connect to ${dbType}...`);

    const clientMap: Record<string, string> = {
      mysql: "mysql2",
      postgresql: "pg",
      oracle: "oracledb",
      sqlserver: "tedious",
    };

    const client = clientMap[dbType] || dbType;

    db = knex({
      client,
      connection: connectionString,
      // 增加连接超时限制，防止一直挂起
      acquireConnectionTimeout: 5000,
      pool: { min: 0, max: 1 },
    });

    // 尝试执行一个极其简单的查询
    // 对于 MySQL/PostgreSQL/SQLServer 通常都是这个
    let testSql = "SELECT 1 as result";
    if (dbType === "oracle") {
      testSql = "SELECT 1 FROM DUAL";
    }

    await db.raw(testSql).timeout(4000);

    console.log(`[TestDB] ✅ Connection successful for ${dbType}`);
    return NextResponse.json({ success: true, message: "数据库连接成功！" });
  } catch (error: any) {
    console.error("[TestDB] ❌ Connection failed:", error.message);

    let friendlyError = error.message;
    if (error.code === "PROTOCOL_CONNECTION_LOST") {
      friendlyError =
        "连接被服务器主动关闭，请检查数据库类型、连接字符串、白名单、账号密码是否正确，或是否需要 SSL。";
    } else if (error.code === "ETIMEDOUT") {
      friendlyError = "连接超时，请检查数据库地址和端口是否开放。";
    } else if (error.code === "ECONNREFUSED") {
      friendlyError = "连接被拒绝，请确认数据库服务是否已启动。";
    }

    return NextResponse.json(
      {
        success: false,
        error: friendlyError,
      },
      { status: 500 }
    );
  } finally {
    if (db) {
      try {
        await db.destroy();
      } catch (e) {}
    }
  }
}
