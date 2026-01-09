import { metadataDb } from "./metadataDb";
import { EntityType } from "../types";

/**
 * 保存导入结果到数据库
 */
export async function saveImportResultToDb(
  tenantId: string,
  entityType: EntityType,
  traceId: string,
  allRecords: any[],
  stageStats?: {
    fetch: { total: number; status: string; reason?: string }; // 新增 reason
    transform: { success: number; failed: number };
    write: { success: number; failed: number };
  }
) {
  const successData = allRecords.filter((r) => r._importStatus === "success");
  const failedData = allRecords.filter((r) => r._importStatus === "failed");

  const summary = {
    total: allRecords.length || stageStats?.fetch?.total || 0,
    success: successData.length,
    failed: failedData.length,
  };

  const stages = stageStats || {
    fetch: { total: allRecords.length, status: "completed" },
    transform: { success: successData.length, failed: failedData.length },
    write: { success: 0, failed: 0 },
  };

  const successDataClean = successData.map(
    ({ _importStatus, _importError, ...rest }) => rest
  );

  const failedDataWithReason = failedData.map(({ _importStatus, _importError, ...rest }) => ({
    data: rest,
    reason: _importError,
  }));

  try {
    const data = {
      tenant_id: tenantId,
      entity_type: entityType,
      trace_id: traceId,
      summary: JSON.stringify(summary),
      stages: JSON.stringify(stages),
      success_data: JSON.stringify(successDataClean),
      failed_data: JSON.stringify(failedDataWithReason),
    };

    /**
     * 重要：不要依赖 trace_id 的唯一索引来做 upsert（不同环境可能没有建 unique）。
     * 策略：先 update；如果没有命中行，再 insert。
     */
    const updated = await metadataDb("bridge_sync_logs")
      .where({ trace_id: traceId })
      .update({
        tenant_id: tenantId,
        entity_type: entityType,
        summary: data.summary,
        stages: data.stages,
        success_data: data.success_data,
        failed_data: data.failed_data,
      });

    if (!updated) {
      await metadataDb("bridge_sync_logs").insert(data);
    }

    console.log(
      `[Storage] 🗄 Import result synced to DB for ${tenantId}:${entityType} (TraceId: ${traceId}, updated=${updated ? "yes" : "no"})`
    );
  } catch (error: any) {
    console.error(`[Storage] ❌ Failed to save import result to DB:`, error.message);
  }
}

