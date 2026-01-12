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
    fetch: { total: number; status: string; reason?: string };
    transform: { success: number; failed: number };
    write: { success: number; failed: number };
  },
  rawDataSample?: any[],
  writeFailureDetails?: any // 新增
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

  // 移除内部标识字段
  const successDataClean = successData.map(
    ({ _importStatus, _importError, _metadata, ...rest }) => rest
  );

  const failedDataWithReason = failedData.map(({ _importStatus, _importError, _metadata, ...rest }) => {
    // 🔧 优化转换失败原因的提取，确保它是一个带有前缀的字符串，或者至少是安全的
    let reason = _importError;
    
    if (typeof _importError === 'object') {
      // 如果是 Zod 格式的对象 (带有 _errors)，添加前缀
      if ((_importError as any)._errors || Object.keys(_importError).some(k => (_importError as any)[k]?._errors)) {
        reason = `[数据校验] ${JSON.stringify(_importError)}`;
      } else {
        reason = JSON.stringify(_importError);
      }
    }
    
    return {
      data: rest,
      reason: reason,
    };
  });

  try {
    const dataToSave: any = {
      tenant_id: tenantId,
      entity_type: entityType,
      trace_id: traceId,
      summary: JSON.stringify(summary),
      stages: JSON.stringify(stages),
      // 🔧 性能优化：如果数据量巨大，为了防止连接池超时，日志中仅保留前 1000 条
      success_data: JSON.stringify(successDataClean.slice(0, 1000)),
      failed_data: JSON.stringify(failedDataWithReason.slice(0, 1000)),
      created_at: metadataDb.fn.now(),
    };

    if (rawDataSample) {
      dataToSave.raw_data_sample = JSON.stringify(rawDataSample);
    }
    
    if (writeFailureDetails) {
      dataToSave.write_failure_details = JSON.stringify(writeFailureDetails);
    }

    // 尝试更新现有记录
    const updatedRows = await metadataDb("bridge_sync_logs")
      .where({ trace_id: traceId })
      .update(dataToSave);

    if (updatedRows === 0) {
      await metadataDb("bridge_sync_logs").insert(dataToSave);
      console.log(`[Storage] 🗄 Inserted new sync log for ${tenantId}:${entityType} (TraceId: ${traceId})`);
    } else {
      console.log(`[Storage] 🗄 Updated sync log for ${tenantId}:${entityType} (TraceId: ${traceId})`);
    }
  } catch (error: any) {
    console.error(`[Storage] ❌ Failed to save import result to DB:`, error.message);
  }
}
