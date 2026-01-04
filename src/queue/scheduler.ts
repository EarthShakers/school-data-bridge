import {
  getAvailableTenants,
  getAvailableEntities,
  getSchoolConfig,
} from "../mapping/localAdapter";
import { syncQueue } from "./syncQueue";

/**
 * 自动调度器：扫描所有配置文件并注册 Cron 任务
 */
export async function setupScheduler(filterTenantId?: string) {
  console.log(
    `[Scheduler] 🕒 Initializing Cron Scheduler... ${
      filterTenantId ? `(Filtered by: ${filterTenantId})` : "(All Tenants)"
    }`
  );

  // 1. 清理旧的重复任务（注意：如果只过滤一个租户，清理逻辑要小心）
  // 为了安全，这里只清理我们将要注册的任务，或者全量清理后重新注册
  const schedulers = await syncQueue.getJobSchedulers();
  for (const scheduler of schedulers) {
    const jobId = scheduler.id;
    if (!filterTenantId || (jobId && jobId.includes(filterTenantId))) {
      await syncQueue.removeJobScheduler(scheduler.key);
    }
  }

  // 2. 遍历指定租户或所有租户
  const tenants = filterTenantId ? [filterTenantId] : getAvailableTenants();
  let count = 0;

  for (const tenantId of tenants) {
    const entities = getAvailableEntities(tenantId);

    for (const entityType of entities) {
      try {
        const config = await getSchoolConfig(tenantId, entityType);

        // 如果配置了 syncConfig 且开启了同步
        if (config.syncConfig?.enabled && config.syncConfig.cron) {
          const { cron, priority = 10 } = config.syncConfig;

          await syncQueue.add(
            "sync-task",
            { tenantId, entityType },
            {
              repeat: { pattern: cron },
              priority,
              jobId: `cron-${tenantId}-${entityType}`, // 修复：不允许包含冒号 ":"
            }
          );

          console.log(
            `[Scheduler] 📅 Registered Cron: ${tenantId}:${entityType} -> "${cron}"`
          );
          count++;
        }
      } catch (err: any) {
        console.error(
          `[Scheduler] ⚠️ Failed to register ${tenantId}:${entityType}: ${err.message}`
        );
      }
    }
  }

  console.log(`[Scheduler] ✨ Done. ${count} cron jobs registered.`);
}
