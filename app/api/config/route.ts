import { NextResponse } from "next/server";
import { metadataDb } from "@/src/utils/metadataDb";
import JSON5 from "json5";

export const dynamic = "force-dynamic";

// GET /api/config?tenantId=xxx&entityType=yyy
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenantId");
  const entityType = searchParams.get("entityType");

  if (!tenantId || !entityType) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  try {
    const row = await metadataDb("bridge_entity_configs")
      .where({ tenant_id: tenantId, entity_type: entityType })
      .first();

    if (row) {
      // 组装回原本的 SchoolConfig 结构（用于编辑器显示）
      // 注意：从 DB 读取的 json 字段，knex 会自动解析为对象/数组
      const config = {
        tenantId: row.tenant_id,
        entityType: row.entity_type,
        dataSource: typeof row.data_source === "string" ? JSON.parse(row.data_source) : row.data_source,
        fieldMap: typeof row.field_map === "string" ? JSON.parse(row.field_map) : row.field_map,
        batchConfig: typeof row.batch_config === "string" ? JSON.parse(row.batch_config) : row.batch_config,
        syncConfig: typeof row.sync_config === "string" ? JSON.parse(row.sync_config) : row.sync_config,
      };
      return NextResponse.json({ content: JSON.stringify(config, null, 2) });
    } else {
      // 如果没有配置，返回一个默认模板
      const defaultConfig = {
        tenantId,
        entityType,
        dataSource: {
          type: "db",
          config: {
            dbType: "mysql",
            connectionString: "",
            modelName: "YourTableName",
            batchSize: 100,
          },
        },
        fieldMap: [],
        batchConfig: { batchSize: 100, retryTimes: 3 },
        syncConfig: { enabled: false, cron: "0 0 * * *", priority: 10 },
      };
      return NextResponse.json({ content: JSON.stringify(defaultConfig, null, 2) });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/config (保存配置)
export async function POST(request: Request) {
  try {
    const { tenantId, entityType, content } = await request.json();
    const config = JSON5.parse(content);

    await metadataDb("bridge_entity_configs")
      .insert({
        tenant_id: tenantId,
        entity_type: entityType,
        data_source: JSON.stringify(config.dataSource),
        field_map: JSON.stringify(config.fieldMap),
        batch_config: JSON.stringify(config.batchConfig || {}),
        sync_config: JSON.stringify(config.syncConfig || {}),
      })
      .onConflict(["tenant_id", "entity_type"])
      .merge();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
