import {
  getSchoolConfig,
  getAvailableEntities,
  getAvailableTenants,
} from "./core/configEngine";
import { fetchFromExternalApi } from "./adapters/apiAdapter";
import { transformAndValidate } from "./core/pipeline";
import { writeToInternalJavaService } from "./services/javaService";
import { baseConfig } from "../config/baseConfig";
import { saveImportResult } from "./utils/fileLogger";

/**
 * 根据实体类型获取 Java 写入接口地址
 */
function getEndpointForEntity(entityType: string): string {
  const base = baseConfig.JAVA_USER_SERVICE_BASE_URL;
  const map: Record<string, string> = {
    teacher: `${base}/v1/base/teacher/batch`,
    student: `${base}/v1/base/stu/batch`,
    organization: `${base}/v1/base/teacher/org/batch`, // 或者根据业务分教师/学生组织
  };
  return map[entityType] || `${base}/v1/base/data/batch`;
}

/**
 * 执行单个导入任务
 */
async function executeSingleTask(tenantId: string, entityType: string) {
  console.log(
    `\n>>> [Executor] Running: Tenant=${tenantId}, Entity=${entityType}`
  );

  try {
    const config = await getSchoolConfig(tenantId, entityType);
    const envelope = await fetchFromExternalApi(config);
    const { allRecords, successCount, failedCount } = await transformAndValidate(envelope, config);

    // 💾 保存统一的导入结果（包含统计、成功数据、失败数据及原因）
    saveImportResult(tenantId, entityType, envelope.traceId, allRecords);

    const dataToWrite = allRecords
      .filter((r) => r._importStatus === "success")
      .map(({ _importStatus, _importError, _metadata, ...rest }) => rest);

    if (dataToWrite.length === 0) {
      console.log(
        `[Executor] Skip: No valid data to write for ${tenantId}:${entityType}`
      );
      return;
    }

    const javaOptions = {
      batchSize: config.batchConfig.batchSize || baseConfig.DEFAULT_BATCH_SIZE,
      concurrency: Math.max(1, baseConfig.MAX_GLOBAL_CONCURRENCY / 2),
      javaEndpoint: getEndpointForEntity(config.entityType),
    };

    const stats = await writeToInternalJavaService(dataToWrite, javaOptions);

    console.log(`[Executor] Result: ${tenantId}:${entityType} ->`, {
      total: allRecords.length,
      valid: successCount,
      invalid: failedCount,
      writeSuccess: stats.success,
      writeFailed: stats.failed,
    });
  } catch (error: any) {
    console.error(
      `[Executor] Failed: ${tenantId}:${entityType} ->`,
      error.message
    );
  }
}

/**
 * 主入口：支持多种执行模式
 */
async function main() {
  const arg1 = process.argv[2]; // tenantId or "all"
  const arg2 = process.argv[3]; // entityType or "all"

  if (!arg1) {
    console.log("Usage: npm start <tenantId|all> [entityType|all]");
    console.log("Available Tenants:", getAvailableTenants().join(", "));
    return;
  }

  const tenants = arg1 === "all" ? getAvailableTenants() : [arg1];

  for (const tenantId of tenants) {
    const availableEntities = getAvailableEntities(tenantId);
    const entitiesToRun = !arg2 || arg2 === "all" ? availableEntities : [arg2];

    if (entitiesToRun.length === 0) {
      console.warn(`[Main] No entities found for tenant: ${tenantId}`);
      continue;
    }

    console.log(
      `[Main] Processing Tenant: ${tenantId} (${entitiesToRun.join(", ")})`
    );

    // 顺序执行各实体导入，避免对单一数据源或 Java 服务造成瞬间高压
    for (const entityType of entitiesToRun) {
      await executeSingleTask(tenantId, entityType);
    }
  }

  console.log("\n[Main] All tasks finished.");
}

main().catch(console.error);
