import { getSchoolConfig } from "../mapping/localAdapter";
import { fetchData } from "../dataImport";
import { transformAndValidate } from "./pipeline";
import { writeToInternalJavaService } from "../saveData/javaService";
import { saveImportResultToDb } from "../utils/dbLogger"; // 修改为 DB Logger
import { baseConfig, getEndpointForEntity } from "../saveData/config";
import { EntityType } from "../types";

/**
 * 执行核心同步逻辑的函数
 * 支持自动分页循环：抓取一页 -> 转换一页 -> 写入一页
 */
export async function runSyncTask(
  tenantId: string,
  entityType: EntityType,
  environment: string = "dev",
  providedTraceId?: string // 新增：可选的外部 traceId
) {
  console.log(
    `\n>>> [Executor] Starting Sync: Tenant=${tenantId}, Entity=${entityType}, Env=${environment}`
  );

  // 必须在 try/catch 之外定义，否则 catch 中无法引用，导致状态无法落库
  const taskTraceId = providedTraceId || `task_${Date.now()}`;

  let totalProcessed = 0;
  let totalWritten = 0;
  let totalFailed = 0;
  let allCollectedRecords: any[] = [];
  let rawDataSample: any[] = [];
  let lastWriteFailure: any = null; // 新增：保存最后的写入失败详情
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

    // --- 修改：使用外部传入或新生成的 traceId ---
    await saveImportResultToDb(tenantId, entityType, taskTraceId, [], {
      fetch: { total: 0, status: "running" },
      transform: { success: 0, failed: 0 },
      write: { success: 0, failed: 0 },
    });

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

      // 采集原始数据样本 (限制采集前 500 条，防止数据库超限，同时也覆盖了大多数场景)
      if (rawDataSample.length < 500) {
        const sample = Array.isArray(rawData) ? rawData : [rawData];
        rawDataSample.push(...sample);
        if (rawDataSample.length > 500) {
          rawDataSample = rawDataSample.slice(0, 500);
        }
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
        const javaResult = await writeToInternalJavaService(dataToWrite, {
          batchSize:
            config.batchConfig.batchSize || baseConfig.DEFAULT_BATCH_SIZE,
          concurrency: Math.max(1, baseConfig.MAX_GLOBAL_CONCURRENCY / 2),
          javaEndpoint: await getEndpointForEntity(
            config.entityType,
            environment
          ),
          authToken: config.javaAuthToken,
          entityType: config.entityType,
        });

        if (javaResult.debugInfo) {
          lastWriteFailure = javaResult.debugInfo;
        }

        // 🚨 核心：如果 Java 写入有失败，将原因同步到 batchRecords 中，但不再修改 transform 的统计计数
        if (javaResult.errors.length > 0) {
          javaResult.errors.forEach((javaErr) => {
            const record = batchRecords.find((r) => r.id === javaErr.id);
            if (record) {
              record._importStatus = "failed";
              record._importError = `[Java业务] ${javaErr.message}`;
            }
          });
        }

        totalWritten += javaResult.success;
        finalStages.write.success += javaResult.success;
        finalStages.write.failed += javaResult.failed;
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

    // 6. 最终日志保存到数据库
    await saveImportResultToDb(
      tenantId,
      entityType,
      taskTraceId,
      allCollectedRecords,
      finalStages,
      rawDataSample,
      lastWriteFailure // 传入失败详情
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
    console.error(
      `[Executor] ❌ Fatal Error: ${tenantId}:${entityType} ->`,
      error.stack || error.message
    );

    // 尝试更新数据库状态为 failed
    try {
      await saveImportResultToDb(
        tenantId,
        entityType,
        taskTraceId,
        allCollectedRecords,
        {
          fetch: {
            total: finalStages.fetch.total,
            status: "failed",
            reason: error.message,
          },
          transform: finalStages.transform,
          write: finalStages.write,
        },
        rawDataSample,
        lastWriteFailure
      );
    } catch (dbError: any) {
      console.error(
        `[Executor] 🚨 Critical: Failed to save error status to DB:`,
        dbError.message
      );
      // 如果保存日志也失败了，我们把原始错误和 DB 错误组合一下抛出，
      // 这样 BullMQ 的 failedReason 就能看到真相
      const combinedError = new Error(
        `[Original Error] ${error.message} | [DB Log Error] ${dbError.message}`
      );
      throw combinedError;
    }

    throw error;
  }
}
