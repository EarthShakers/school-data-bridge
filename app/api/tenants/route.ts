import { NextResponse } from "next/server";
import { metadataDb } from "@/src/utils/metadataDb";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 明确映射数据库字段到前端期望的驼峰命名
    const tenants = await metadataDb("bridge_tenants").select(
      "tenant_id as tenantId",
      "school_name as schoolName",
      "status"
    );

    console.log(`[API Tenants] Fetched ${tenants.length} tenants from DB`);
    return NextResponse.json({ tenants });
  } catch (error: any) {
    console.error("[API Tenants GET Error]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { tenantId, schoolName, status, commonConfig } = await request.json();

    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant ID is required" },
        { status: 400 }
      );
    }

    // 1. 检查是否存在
    const exists = await metadataDb("bridge_tenants")
      .where({ tenant_id: tenantId })
      .first();
    if (exists) {
      return NextResponse.json(
        { error: `Tenant '${tenantId}' already exists.` },
        { status: 409 }
      );
    }

    // 2. 创建租户记录
    await metadataDb("bridge_tenants").insert({
      tenant_id: tenantId,
      school_name: schoolName || `新学校 (${tenantId})`,
      status: status || "active",
      common_config: JSON.stringify(
        commonConfig || {
          dbType: "mysql",
          dbConnection: "",
          apiBaseUrl: "",
          apiAuthToken: "",
        }
      ),
    });

    // 3. 默认生成 5 个标准实体的初始配置
    const standardEntities = [
      "teacher",
      "student",
      "teacherOrganizations",
      "studentOrganizations",
      "class",
    ];
    for (const entityType of standardEntities) {
      await metadataDb("bridge_entity_configs").insert({
        tenant_id: tenantId,
        entity_type: entityType,
        data_source: JSON.stringify({
          type: "db",
          config: {
            dbType: "",
            connectionString: "",
            modelName: "YourTableName",
            batchSize: 100,
          },
        }),
        field_map: JSON.stringify([]),
        batch_config: JSON.stringify({ batchSize: 100, retryTimes: 3 }),
        sync_config: JSON.stringify({
          enabled: false,
          cron: "0 0 * * *",
          priority: 10,
        }),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[API Tenants POST Error]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
