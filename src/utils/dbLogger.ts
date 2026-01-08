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
    fetch: { total: number; status: string };
    transform: { success: number; failed: number };
    write: { success: number; failed: number };
  }
) {
  const successData = allRecords.filter((r) => r._importStatus === "success");
  const failedData = allRecords.filter((r) => r._importStatus === "failed");

  const summary = {
    total: allRecords.length,
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
    await metadataDb("bridge_sync_logs").insert({
      tenant_id: tenantId,
      entity_type: entityType,
      trace_id: traceId,
      summary: JSON.stringify(summary),
      stages: JSON.stringify(stages),
      success_data: JSON.stringify(successDataClean),
      failed_data: JSON.stringify(failedDataWithReason),
    });
    console.log(`[Storage] 🗄 Import result saved to Database for ${tenantId}:${entityType}`);
  } catch (error: any) {
    console.error(`[Storage] ❌ Failed to save import result to DB:`, error.message);
  }
}

