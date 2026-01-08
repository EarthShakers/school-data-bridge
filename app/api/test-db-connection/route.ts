import { NextResponse } from "next/server";
import knex from "knex";
import { Client as PgClient } from "pg";
import mysql from "mysql2/promise";
import oracledb from "oracledb"; // 引入原生 Oracle 驱动

export async function POST(request: Request) {
  let db: any = null;
  let pgClient: PgClient | null = null;
  let mysqlConn: any = null;
  let oracleConn: any = null;

  try {
    const { dbType, connection } = await request.json();

    if (!dbType || !connection) {
      return NextResponse.json({ error: "参数缺失" }, { status: 400 });
    }

    const isString = typeof connection === "string";

    // --- 1. PostgreSQL (原生驱动) ---
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

      await pgClient.connect();
      await pgClient.query("SELECT 1");
      await pgClient.end();
      return NextResponse.json({
        success: true,
        message: "PostgreSQL 连接成功！",
      });
    }

    // --- 2. MySQL (原生驱动) ---
    if (dbType === "mysql") {
      const mysqlConfig = isString
        ? connection
        : {
            host: connection.host,
            port: Number(connection.port) || 3306,
            user: connection.user,
            password: connection.password,
            database: connection.database,
            connectTimeout: 10000,
          };

      mysqlConn = await mysql.createConnection(mysqlConfig as any);
      await mysqlConn.query("SELECT 1");
      await mysqlConn.end();
      return NextResponse.json({
        success: true,
        message: "MySQL 连接成功！",
      });
    }

    // --- 3. Oracle (原生驱动) ---
    if (dbType === "oracle") {
      let connectString = "";
      if (isString) {
        connectString = connection;
      } else {
        const host = connection.host;
        const port = connection.port || 1521;
        const serviceName = connection.database || connection.serviceName;
        const sid = connection.sid;

        // 如果提供了 SID，格式是 host:port:sid；如果是 ServiceName，格式是 host:port/serviceName
        if (sid) {
          connectString = `${host}:${port}:${sid}`;
        } else {
          connectString = `${host}:${port}/${serviceName}`;
        }
      }

      const oracleConfig = {
        user: isString ? "" : connection.user,
        password: isString ? "" : connection.password,
        connectString: connectString,
      };

      console.log(
        `[TestDB] Oracle Attempting: ${connectString} (User: ${oracleConfig.user})`
      );

      // 增加连接超时配置
      oracleConn = await oracledb.getConnection({
        ...oracleConfig,
        connectTimeout: 10000, // 10秒连接超时
      });
      await oracleConn.execute("SELECT 1 FROM DUAL");
      await oracleConn.close();
      return NextResponse.json({
        success: true,
        message: "Oracle 连接成功！",
      });
    }

    // --- 4. 其他数据库 (SQLServer 使用 Knex) ---
    const clientMap: Record<string, string> = {
      sqlserver: "tedious",
    };

    db = knex({
      client: clientMap[dbType] || dbType,
      connection: connection,
      acquireConnectionTimeout: 10000,
      pool: { min: 0, max: 1, idleTimeoutMillis: 100 },
    });

    let testSql = "SELECT 1 as result";
    await db.raw(testSql).timeout(10000);

    return NextResponse.json({
      success: true,
      message: `${dbType} 连接成功！`,
    });
  } catch (error: any) {
    console.error("[TestDB] Connection failed:", error.code, error.message);

    // 返回更有意义的错误信息
    let userMessage = error.message;
    const errCode = error.code || (error.offset ? "ORACLE_ERR" : "");

    if (errCode === "ECONNREFUSED")
      userMessage = "连接被拒绝：请检查 IP 和端口是否开放";
    if (errCode === "ETIMEDOUT") userMessage = "连接超时：网络不通或防火墙拦截";
    if (errCode === "ER_ACCESS_DENIED_ERROR")
      userMessage = "访问被拒绝：账号或密码错误";

    // Oracle 常见错误处理
    if (userMessage.includes("ORA-01017"))
      userMessage = "Oracle 访问被拒绝：用户名/密码无效";
    if (userMessage.includes("ORA-12170") || userMessage.includes("NJS-510"))
      userMessage = "Oracle 连接超时：请检查数据库 IP 是否公网可达及防火墙";
    if (userMessage.includes("ORA-12541"))
      userMessage = "Oracle 监听错误：TNS 无监听程序（请检查端口 1521）";
    if (userMessage.includes("NJS-511"))
      userMessage = "Oracle 网络不可达：请检查 IP 地址和 VPN 状态";

    return NextResponse.json(
      { success: false, error: userMessage },
      { status: 500 }
    );
  } finally {
    if (db) await db.destroy();
    if (mysqlConn) await mysqlConn.end().catch(() => {});
    if (oracleConn) await oracleConn.close().catch(() => {});
  }
}
