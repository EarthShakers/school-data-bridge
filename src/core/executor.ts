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
  let page = 1;
  let offset = 0;
  let hasMore = true;

  try {
    const config = await getSchoolConfig(tenantId, entityType);
    const traceId = `trace_${Date.now()}`; // 统一本次同步的 traceId

    while (hasMore) {
      // 1. 准备本次抓取的配置（支持分页/偏移量动态更新）
      const currentConfig = { ...config };
      if (
        currentConfig.dataSource.type === "api" &&
        currentConfig.dataSource.config.pagination
      ) {
        currentConfig.dataSource.config.pagination.startPage = page;
      } else if (currentConfig.dataSource.type === "db") {
        currentConfig.dataSource.config.offset = offset;
      }

      // 2. 抓取当前批次数据
      const envelope = await fetchData(currentConfig);
      const rawData = envelope.rawData;

      if (!rawData || (Array.isArray(rawData) && rawData.length === 0)) {
        console.log(
          `[Executor] 🏁 No more data found at page ${page}/offset ${offset}.`
        );
        break;
      }

      const currentBatchSize = Array.isArray(rawData) ? rawData.length : 1;

      // 3. 转换与校验当前批次
      const { allRecords, successCount, failedCount } =
        await transformAndValidate(envelope, currentConfig);

      // 4. 保存本地日志 (Staging & Audit)
      saveImportResult(tenantId, entityType, envelope.traceId, allRecords);

      // 5. 过滤出成功数据并准备写入
      const dataToWrite = allRecords
        .filter((r) => r._importStatus === "success")
        .map(({ _importStatus, _importError, _metadata, ...rest }) => rest);

      if (dataToWrite.length > 0) {
        // 6. 写入 Java 服务
        const javaOptions = {
          batchSize:
            config.batchConfig.batchSize || baseConfig.DEFAULT_BATCH_SIZE,
          concurrency: Math.max(1, baseConfig.MAX_GLOBAL_CONCURRENCY / 2),
          javaEndpoint: getEndpointForEntity(config.entityType),
        };

        const stats = await writeToInternalJavaService(
          dataToWrite,
          javaOptions
        );
        totalWritten += stats.success;
        totalFailed += stats.failed;
      }

      totalProcessed += currentBatchSize;
      totalFailed += failedCount;

      console.log(
        `[Executor] 📦 Batch Finished: Page ${page}, Processed ${currentBatchSize}, Valid ${successCount}, Invalid ${failedCount}`
      );

      // 7. 判断是否还有下一页
      if (
        currentConfig.dataSource.type === "api" &&
        currentConfig.dataSource.config.pagination
      ) {
        page++;
        // 如果返回的数据少于每页大小，说明是最后一页
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
        // 非分页数据源，执行一次即退出
        hasMore = false;
      }

      // 🧪 Mock 模式保护：避免死循环
      if (
        config.dataSource.type === "api" &&
        config.dataSource.config.url.includes("example.com")
      ) {
        hasMore = false;
      }
    }

    console.log(
      `\n[Executor] ✨ All Batches Finished for ${tenantId}:${entityType}:`,
      {
        totalProcessed,
        totalWritten,
        totalFailed,
      }
    );

    return {
      success: true,
      total: totalProcessed,
      written: totalWritten,
      failed: totalFailed,
    };
  } catch (error: any) {
    console.error(
      `[Executor] ❌ Fatal Error: ${tenantId}:${entityType} ->`,
      error.message
    );
    throw error;
  }
}
