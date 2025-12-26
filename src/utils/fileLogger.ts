import fs from "fs";
import path from "path";

/**
 * 生成简短的文件名后缀：时间戳_短ID
 */
function generateShortSuffix(traceId: string) {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, "-").slice(0, 19); // 2023-10-27T10-20-30
  const shortId = traceId.slice(0, 5);
  return `${timestamp}_${shortId}`;
}

/**
 * 保存导入结果（统一版本：包含统计、成功数据、失败数据及原因）
 */
export function saveImportResult(
  tenantId: string,
  entityType: string,
  traceId: string,
  allRecords: any[]
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
    // 成功的数据（移除内部标识字段以保持干净）
    successData: successData.map(({ _importStatus, _importError, ...rest }) => rest),
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
  entityType: string,
  traceId: string,
  report: any
) {
  // 保持向后兼容，暂时留着
}
