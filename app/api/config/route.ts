import { NextResponse } from "next/server";
import { metadataDb } from "@/src/utils/metadataDb";
import JSON5 from "json5";

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
      const config = {
        tenantId: row.tenant_id,
        entityType: row.entity_type,
        dataSource: row.data_source,
        fieldMap: row.field_map,
        batchConfig: row.batch_config,
        syncConfig: row.sync_config,
      };
      return NextResponse.json({ content: JSON.stringify(config, null, 2) });
    } else {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
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
