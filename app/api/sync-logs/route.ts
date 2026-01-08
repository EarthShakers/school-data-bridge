import { NextResponse } from "next/server";
import { metadataDb } from "@/src/utils/metadataDb";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenantId");
  const entityType = searchParams.get("entityType");
  const logId = searchParams.get("id");

  if (!tenantId || !entityType) {
    return NextResponse.json(
      { error: "Missing parameters: tenantId and entityType are required" },
      { status: 400 }
    );
  }

  try {
    console.log(`[API Logs] Fetching logs for ${tenantId}:${entityType}, id=${logId}`);
    // 1. 如果指定了 ID，返回具体记录详情
    if (logId) {
      const log = await metadataDb("bridge_sync_logs")
        .where({ id: logId })
        .first();

      if (!log) {
        return NextResponse.json({ error: "Log not found" }, { status: 404 });
      }

      // 解析存储在 DB 中的 JSON 字段
      return NextResponse.json({
        id: log.id,
        tenantId: log.tenant_id,
        entityType: log.entity_type,
        traceId: log.trace_id,
        summary:
          typeof log.summary === "string"
            ? JSON.parse(log.summary)
            : log.summary,
        stages:
          typeof log.stages === "string" ? JSON.parse(log.stages) : log.stages,
        successData:
          typeof log.success_data === "string"
            ? JSON.parse(log.success_data)
            : log.success_data,
        failedData:
          typeof log.failed_data === "string"
            ? JSON.parse(log.failed_data)
            : log.failed_data,
        time: log.created_at,
      });
    }

    // 2. 否则返回列表 (只返回摘要信息，不返回大数据量详情)
    const logs = await metadataDb("bridge_sync_logs")
      .where({ tenant_id: tenantId, entity_type: entityType })
      .select("id", "trace_id", "summary", "stages", "created_at as time")
      .orderBy("created_at", "desc")
      .limit(50);

    const formattedLogs = logs.map((log) => ({
      id: log.id,
      traceId: log.trace_id,
      time: log.time,
      summary:
        typeof log.summary === "string" ? JSON.parse(log.summary) : log.summary,
      stages:
        typeof log.stages === "string" ? JSON.parse(log.stages) : log.stages,
    }));

    return NextResponse.json({ logs: formattedLogs });
  } catch (error: any) {
    console.error("[API Logs GET Error]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
