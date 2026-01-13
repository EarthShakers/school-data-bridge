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
  let allBatchDetails: any[] = []; // 存储所有批次的详情
  let finalStages = {
    fetch: { total: 0, status: "success" },
    transform: { success: 0, failed: 0 },
    write: { success: 0, failed: 0 },
  };

  let page = 1;
  let offset = 0;
  let hasMore = true;

  try {
    const startTime = Date.now();
    const config = await getSchoolConfig(tenantId, entityType);
    console.log(`[Executor] ⏱ Config loaded in ${Date.now() - startTime}ms`);

    // 预先获取写入端点，避免在循环中重复查询数据库
    const javaEndpoint = await getEndpointForEntity(
      config.entityType,
      environment
    );
    console.log(`[Executor] 🚀 Target Endpoint: ${javaEndpoint}`);

    // --- 修改：使用外部传入或新生成的 traceId ---
    await saveImportResultToDb(tenantId, entityType, taskTraceId, [], {
      fetch: { total: 0, status: "running" },
      transform: { success: 0, failed: 0 },
      write: { success: 0, failed: 0 },
    });

    while (hasMore) {
      const batchStartTime = Date.now();
      // 1. 准备配置
      const currentConfig = { ...config };
      // ... (省略中间逻辑保持不变)
      if (
        currentConfig.dataSource.type === "api" &&
        currentConfig.dataSource.config.pagination
      ) {
        currentConfig.dataSource.config.pagination.startPage = page;
      } else if (currentConfig.dataSource.type === "db") {
        currentConfig.dataSource.config.offset = offset;
      }

      // 2. 抓取数据
      const fetchStart = Date.now();
      const envelope = await fetchData(currentConfig);
      console.log(
        `[Executor] 📥 Fetch batch took ${Date.now() - fetchStart}ms`
      );

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

      // 采集原始数据样本 (限制采集前 500 条)
      if (rawDataSample.length < 500) {
        const sample = Array.isArray(rawData) ? rawData : [rawData];
        rawDataSample.push(...sample);
        if (rawDataSample.length > 500) {
          rawDataSample = rawDataSample.slice(0, 500);
        }
      }

      // 3. 转换与校验
      const transformStart = Date.now();
      const {
        allRecords: batchRecords,
        successCount,
        failedCount,
      } = await transformAndValidate(envelope, currentConfig);
      console.log(
        `[Executor] ⚙️ Transform batch took ${Date.now() - transformStart}ms`
      );

      allCollectedRecords.push(...batchRecords);
      finalStages.fetch.total += currentBatchSize;
      finalStages.transform.success += successCount;
      finalStages.transform.failed += failedCount;

      // 4. 写入 Java 服务
      const dataToWrite = batchRecords
        .filter((r) => r._importStatus === "pending_write") // 👈 只处理待写入的数据
        .map(({ _importStatus, _importError, _metadata, ...rest }) => rest);

      if (dataToWrite.length > 0) {
        const writeStart = Date.now();
        const javaResult = await writeToInternalJavaService(dataToWrite, {
          batchSize:
            config.batchConfig.batchSize || baseConfig.DEFAULT_BATCH_SIZE,
          concurrency: Math.max(1, baseConfig.MAX_GLOBAL_CONCURRENCY / 2),
          javaEndpoint, // 使用预获取的端点
          authToken: config.javaAuthToken,
          entityType: config.entityType,
        });
        console.log(
          `[Executor] 📤 Write batch took ${Date.now() - writeStart}ms`
        );

        if (javaResult.batchDetails) {
          allBatchDetails.push(...javaResult.batchDetails);
        }

        // 🚨 核心改进：严谨更新每一条记录的状态
        // 1. 先把当前批次所有 pending_write 的改为 success (乐观假设当前批次接口层没崩)
        batchRecords.forEach((r) => {
          if (r._importStatus === "pending_write") {
            r._importStatus = "success";
          }
        });

        // 2. 如果 Java 接口返回了具体的错误 ID 列表，精准修正为 failed
        if (javaResult.errors.length > 0) {
          javaResult.errors.forEach((javaErr) => {
            const record = batchRecords.find((r) => r.id === javaErr.id);
            if (record) {
              record._importStatus = "failed";
              record._importError = `[Java业务] ${javaErr.message}`;
            }
          });
        }

        // 3. 兜底：如果整个接口调用判定为失败（比如 code 不是 200），则该批次全部标记为失败
        if (javaResult.success === 0 && dataToWrite.length > 0) {
          batchRecords.forEach((r) => {
            // 排除掉已经是 Zod 校验失败的数据，只改本批次写入的数据
            if (r._importStatus === "success") {
              r._importStatus = "failed";
              r._importError = `[Java接口] 写入失败，请在 Debug 窗口检查 Response`;
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
      allBatchDetails // 传入所有批次的详细信息
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
        allBatchDetails
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
