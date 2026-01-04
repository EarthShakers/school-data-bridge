import { getAvailableTenants, getAvailableEntities } from "./mapping/localAdapter";
import { runSyncTask } from "./core/executor";
import { setupScheduler } from "./queue/scheduler";
import { addSyncJob } from "./queue/syncQueue";

/**
 * 主入口：支持多种执行模式
 * 1. 命令行直接执行 (Immediate)
 * 2. 启动 Worker 处理队列 (Worker)
 * 3. 启动 Scheduler 注册定时任务 (Scheduler)
 * 4. 推送任务到队列 (Producer)
 */
async function main() {
  const mode = process.env.RUN_MODE || "manual"; // manual | worker | scheduler | producer
  const arg1 = process.argv[2]; // tenantId or "all"
  const arg2 = process.argv[3]; // entityType or "all"

  console.log(`[Main] 🚀 Starting service in mode: ${mode}`);

  if (mode === "worker") {
    // 启动 Worker (通过导入启动)
    require("./queue/worker");
    return;
  }

  if (mode === "scheduler") {
    // 启动调度器并注册 Cron
    await setupScheduler(arg1); // arg1 是可选的 tenantId
    // 调度器运行后不需要退出，除非你想只注册一次
    console.log("[Main] Scheduler is running. Press Ctrl+C to exit.");
    return;
  }

  if (mode === "producer") {
    if (!arg1) {
      console.log("Usage: RUN_MODE=producer npm start <tenantId|all> [entityType|all]");
      return;
    }
    await pushToQueue(arg1, arg2);
    process.exit(0);
  }

  // 默认：手动/立即执行模式
  if (!arg1) {
    console.log("Usage: npm start <tenantId|all> [entityType|all]");
    console.log("Available Tenants:", getAvailableTenants().join(", "));
    return;
  }

  await runImmediately(arg1, arg2);
  process.exit(0);
}

/**
 * 推送任务到 BullMQ 队列
 */
async function pushToQueue(arg1: string, arg2?: string) {
  const tenants = arg1 === "all" ? getAvailableTenants() : [arg1];
  for (const tenantId of tenants) {
    const availableEntities = getAvailableEntities(tenantId);
    const entitiesToRun = !arg2 || arg2 === "all" ? availableEntities : [arg2];
    for (const entityType of entitiesToRun) {
      await addSyncJob(tenantId, entityType);
    }
  }
}

/**
 * 立即执行同步（原有逻辑）
 */
async function runImmediately(arg1: string, arg2?: string) {
  const tenants = arg1 === "all" ? getAvailableTenants() : [arg1];
  for (const tenantId of tenants) {
    const availableEntities = getAvailableEntities(tenantId);
    const entitiesToRun = !arg2 || arg2 === "all" ? availableEntities : [arg2];
    for (const entityType of entitiesToRun) {
      await runSyncTask(tenantId, entityType);
    }
  }
}

main().catch((err) => {
  console.error("[Main] Fatal Error:", err);
  process.exit(1);
});
