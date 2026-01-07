import { NextResponse } from "next/server";
import {
  getAvailableTenants,
  getAvailableEntities,
} from "@/src/mapping/localAdapter";
import fs from "fs";
import path from "path";
import JSON5 from "json5";

const CONFIG_BASE_PATH = path.join(process.cwd(), "config", "schools");

export async function GET() {
  try {
    const tenantIds = getAvailableTenants();
    const tenants = tenantIds.map((tenantId) => {
      const configPath = path.join(
        CONFIG_BASE_PATH,
        tenantId,
        "tenantConfig.json5"
      );
      let tenantConfig = { schoolName: "未知学校", status: "unknown" };

      if (fs.existsSync(configPath)) {
        try {
          const content = fs.readFileSync(configPath, "utf-8");
          // 修正：使用 JSON5 解析，防止因注释导致报错
          const parsed = JSON5.parse(content);
          tenantConfig = {
            schoolName: parsed.schoolName || "未命名学校",
            status: parsed.status || "active",
          };
        } catch (e) {}
      }

      return {
        tenantId,
        ...tenantConfig,
        entities: getAvailableEntities(tenantId),
      };
    });

    return NextResponse.json({ tenants });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { tenantId } = await request.json();
    if (!tenantId) {
      return NextResponse.json({ error: "租户 ID 不能为空" }, { status: 400 });
    }

    const tenantPath = path.join(CONFIG_BASE_PATH, tenantId);
    if (fs.existsSync(tenantPath)) {
      return NextResponse.json({ error: "租户已存在" }, { status: 400 });
    }

    // 1. 创建租户目录
    fs.mkdirSync(tenantPath, { recursive: true });

    // 2. 初始化租户全局配置 tenantConfig.json5
    const tenantConfigPath = path.join(tenantPath, "tenantConfig.json5");
    const defaultTenantConfig = {
      tenantId,
      schoolName: "未命名学校",
      status: "active",
      commonConfig: {
        dbType: "mysql",
        dbConnection: "",
        apiBaseUrl: "",
        apiAuthToken: "",
      },
      description: "新入驻租户",
      createdAt: new Date().toISOString(),
    };
    fs.writeFileSync(
      tenantConfigPath,
      JSON.stringify(defaultTenantConfig, null, 2),
      "utf-8"
    );

    // 3. 默认生成 5 个标准实体的配置文件
    const defaultEntities = [
      "teacher",
      "student",
      "teacherOrganizations",
      "studentOrganizations",
      "class",
    ];

    for (const entityType of defaultEntities) {
      const configPath = path.join(tenantPath, `${entityType}.json5`);
      const defaultContent = JSON.stringify(
        {
          tenantId,
          schoolName: "新租户",
          entityType,
          dataSource: {
            type: "db", // 默认显示为 DB 模式，方便用户看到数据库配置
            config: {
              dbType: "", // 留空，自动回退到租户级配置
              connectionString: "", // 留空，自动回退到租户级配置
              modelName: "YOUR_TABLE_NAME",
              batchSize: 100,
            },
          },
          fieldMap: [{ sourceField: "id", targetField: "id", label: "ID" }],
          batchConfig: { batchSize: 100, retryTimes: 3 },
          syncConfig: { enabled: false, cron: "0 0 * * *" },
        },
        null,
        2
      );
      fs.writeFileSync(configPath, defaultContent, "utf-8");
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
