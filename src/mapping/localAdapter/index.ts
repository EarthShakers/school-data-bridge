import { metadataDb } from "../../utils/metadataDb";
import { SchoolConfig, EntityType } from "../../types";

/**
 * 获取特定租户下特定实体的配置，并合并租户级共享配置 (从数据库读取)
 */
export async function getSchoolConfig(
  tenantId: string,
  entityType: EntityType
): Promise<SchoolConfig> {
  // 1. 读取实体配置
  const entityRow = await metadataDb("bridge_entity_configs")
    .where({ tenant_id: tenantId, entity_type: entityType })
    .first();

  if (!entityRow) {
    throw new Error(
      `[Config] Entity configuration not found in DB for ${tenantId}:${entityType}`
    );
  }

  // 2. 读取租户级配置
  const tenantRow = await metadataDb("bridge_tenants")
    .where({ tenant_id: tenantId })
    .first();

  const commonConfig = tenantRow?.common_config || {};

  // 3. 合并配置
  const mergedConfig: SchoolConfig = {
    tenantId: tenantId,
    entityType: entityType,
    schoolName: tenantRow?.school_name || "未命名学校",
    dataSource: entityRow.data_source,
    fieldMap: entityRow.field_map,
    batchConfig: entityRow.batch_config || { batchSize: 100, retryTimes: 3 },
    syncConfig: entityRow.sync_config || { enabled: false, cron: "0 0 * * *" },
  };

  // 4. 数据源合并优先级
  if (mergedConfig.dataSource.type === "db") {
    const dbConfig = mergedConfig.dataSource.config;
    dbConfig.dbType = dbConfig.dbType || commonConfig.dbType;
    dbConfig.connectionString =
      dbConfig.connectionString || commonConfig.dbConnection;
  } else if (mergedConfig.dataSource.type === "api") {
    const apiConfig = mergedConfig.dataSource.config;
    if (commonConfig.apiBaseUrl && apiConfig.url?.startsWith("/")) {
      apiConfig.url = `${commonConfig.apiBaseUrl}${apiConfig.url}`;
    }
    if (commonConfig.apiAuthToken) {
      apiConfig.headers = {
        ...apiConfig.headers,
        Authorization: `Bearer ${commonConfig.apiAuthToken}`,
      };
    }
  }

  return mergedConfig;
}

/**
 * 获取租户下所有可用的实体类型 (改回同步函数，防止调用方报错)
 */
export function getAvailableEntities(tenantId: string): EntityType[] {
  return [
    "teacher",
    "student",
    "teacherOrganizations",
    "studentOrganizations",
    "class",
  ];
}

/**
 * 获取所有已配置的租户 (确保返回 string[])
 */
export async function getAvailableTenants(): Promise<string[]> {
  const rows = await metadataDb("bridge_tenants").select("tenant_id");
  return rows.map((r) => r.tenant_id);
}
