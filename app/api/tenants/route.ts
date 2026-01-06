import { NextResponse } from "next/server";
import {
  getAvailableTenants,
  getAvailableEntities,
} from "@/src/mapping/localAdapter";
import fs from "fs";
import path from "path";

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
          // 兼容 JSON5
          const parsed = JSON.parse(content);
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
            type: "api",
            config: {
              url: `https://api.example.com/${entityType}`,
              method: "GET",
              params: {},
              pagination: {
                pageParam: "page",
                sizeParam: "size",
                pageSize: 100,
              },
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
