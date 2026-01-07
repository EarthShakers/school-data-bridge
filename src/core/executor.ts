import { getSchoolConfig } from "../mapping/localAdapter";
import { fetchData } from "../dataImport";
import { transformAndValidate } from "./pipeline";
import { writeToInternalJavaService } from "../saveData/javaService";
import { saveImportResult } from "../utils/fileLogger";
import { baseConfig, getEndpointForEntity } from "../saveData/config";
import { EntityType } from "../types";

/**
 * 执行核心同步逻辑的函数
 * 支持自动分页循环：抓取一页 -> 转换一页 -> 写入一页
 */
export async function runSyncTask(tenantId: string, entityType: EntityType) {
  console.log(
    `\n>>> [Executor] Starting Sync: Tenant=${tenantId}, Entity=${entityType}`
  );

  let totalProcessed = 0;
  let totalWritten = 0;
  let totalFailed = 0;
  let allCollectedRecords: any[] = [];
  let finalStages = {
    fetch: { total: 0, status: "success" },
    transform: { success: 0, failed: 0 },
    write: { success: 0, failed: 0 },
  };

  let page = 1;
  let offset = 0;
  let hasMore = true;

  try {
    const config = await getSchoolConfig(tenantId, entityType);
    const taskTraceId = `task_${Date.now()}`;

    while (hasMore) {
      // 1. 准备配置
      const currentConfig = { ...config };
      if (
        currentConfig.dataSource.type === "api" &&
        currentConfig.dataSource.config.pagination
      ) {
        currentConfig.dataSource.config.pagination.startPage = page;
      } else if (currentConfig.dataSource.type === "db") {
        currentConfig.dataSource.config.offset = offset;
      }

      // 2. 抓取数据
      const envelope = await fetchData(currentConfig);
      const rawData = envelope.rawData;
      const currentBatchSize = Array.isArray(rawData)
        ? rawData.length
        : rawData
        ? 1
        : 0;

      if (currentBatchSize === 0) {
        console.log(`[Executor] 🏁 No more data found.`);
        break;
      }

      // 3. 转换与校验
      const {
        allRecords: batchRecords,
        successCount,
        failedCount,
      } = await transformAndValidate(envelope, currentConfig);

      allCollectedRecords.push(...batchRecords);
      finalStages.fetch.total += currentBatchSize;
      finalStages.transform.success += successCount;
      finalStages.transform.failed += failedCount;

      // 4. 写入 Java 服务
      const dataToWrite = batchRecords
        .filter((r) => r._importStatus === "success")
        .map(({ _importStatus, _importError, _metadata, ...rest }) => rest);

      if (dataToWrite.length > 0) {
        const stats = await writeToInternalJavaService(dataToWrite, {
          batchSize:
            config.batchConfig.batchSize || baseConfig.DEFAULT_BATCH_SIZE,
          concurrency: Math.max(1, baseConfig.MAX_GLOBAL_CONCURRENCY / 2),
          javaEndpoint: getEndpointForEntity(config.entityType),
        });
        totalWritten += stats.success;
        finalStages.write.success += stats.success;
        finalStages.write.failed += stats.failed;
      }

      totalProcessed += currentBatchSize;
      totalFailed += failedCount;

      console.log(
        `[Executor] 📦 Batch Finished: Page ${page}, Processed ${currentBatchSize}, Valid ${successCount}`
      );

      // 5. 分页控制
      if (
        currentConfig.dataSource.type === "api" &&
        currentConfig.dataSource.config.pagination
      ) {
        page++;
        if (
          currentBatchSize < currentConfig.dataSource.config.pagination.pageSize
        ) {
          hasMore = false;
        }
      } else if (currentConfig.dataSource.type === "db") {
        const dbBatchSize = currentConfig.dataSource.config.batchSize || 1000;
        offset += dbBatchSize;
        if (currentBatchSize < dbBatchSize) {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }

      // Mock 保护
      if (
        config.dataSource.type === "api" &&
        config.dataSource.config.url.includes("example.com")
      ) {
        hasMore = false;
      }
    }

    // 6. 最终日志保存
    saveImportResult(
      tenantId,
      entityType,
      taskTraceId,
      allCollectedRecords,
      finalStages
    );

    console.log(
      `\n[Executor] ✨ Task Completed: Total ${totalProcessed}, Written ${totalWritten}`
    );

    return {
      success: true,
      total: totalProcessed,
      written: totalWritten,
      failed: totalFailed + finalStages.write.failed,
    };
  } catch (error: any) {
    console.error(`[Executor] ❌ Fatal Error:`, error.message);
    throw error;
  }
}
