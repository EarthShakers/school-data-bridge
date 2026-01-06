import fs from "fs";
import path from "path";
import dayjs from "dayjs";
import { EntityType } from "../types";

/**
 * 生成简短的文件名后缀：时间戳_短ID
 */
function generateShortSuffix(traceId: string) {
  const now = new Date();
  const timestamp = dayjs(now).format("YYYY-MM-DD_HH:mm:ss"); // 2025-12-29_10:20:30
  const shortId = traceId.slice(0, 5);
  return `${timestamp}_${shortId}`;
}

/**
 * 保存导入结果（统一版本：包含统计、成功数据、失败数据及原因）
 */
export function saveImportResult(
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
  const logDir = path.join(process.cwd(), "logs", "transformed", tenantId);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const successData = allRecords.filter((r) => r._importStatus === "success");
  const failedData = allRecords.filter((r) => r._importStatus === "failed");

  const result = {
    summary: {
      total: allRecords.length,
      success: successData.length,
      failed: failedData.length,
    },
    // 新增全流程阶段指标
    stages: stageStats || {
      fetch: { total: allRecords.length, status: "completed" },
      transform: { success: successData.length, failed: failedData.length },
      write: { success: 0, failed: 0 },
    },
    // 成功的数据（移除内部标识字段以保持干净）
    successData: successData.map(
      ({ _importStatus, _importError, ...rest }) => rest
    ),
    // 失败的数据（包含原因）
    failedData: failedData.map(({ _importStatus, _importError, ...rest }) => ({
      data: rest,
      reason: _importError,
    })),
  };

  const suffix = generateShortSuffix(traceId);
  const filePath = path.join(logDir, `${entityType}_${suffix}.json`);

  try {
    fs.writeFileSync(filePath, JSON.stringify(result, null, 2), "utf-8");
    console.log(`[Storage] 💾 Import result saved to: ${filePath}`);
  } catch (error: any) {
    console.error(`[Storage] Failed to save import result:`, error.message);
  }
}

/**
 * @deprecated 请使用 saveImportResult
 */
export function saveImportReport(
  tenantId: string,
  entityType: EntityType,
  traceId: string,
  report: any
) {
  // 保持向后兼容，暂时留着
}
