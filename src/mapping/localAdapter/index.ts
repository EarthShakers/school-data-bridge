import fs from "fs";
import path from "path";
import JSON5 from "json5";
import { EntityType, SchoolConfig } from "../../types";

const CONFIG_BASE_PATH = path.join(process.cwd(), "config", "schools");

/**
 * 获取特定租户下特定实体的配置
 * 增强逻辑：自动合并 tenantConfig.json5 中的共性配置
 */
export async function getSchoolConfig(
  tenantId: string,
  entityType: EntityType
): Promise<SchoolConfig> {
  const tenantPath = path.join(CONFIG_BASE_PATH, tenantId);
  const tenantConfigPath = path.join(tenantPath, "tenantConfig.json5");
  const entityConfigPath = path.join(tenantPath, `${entityType}.json5`);

  // 1. 读取实体配置
  if (!fs.existsSync(entityConfigPath)) {
    throw new Error(
      `[Config] Entity configuration not found for ${tenantId}:${entityType}`
    );
  }
  const entityContent = fs.readFileSync(entityConfigPath, "utf-8");
  const entityConfig = JSON5.parse(entityContent);

  // 2. 读取租户全局配置（如果存在）
  let tenantConfig: any = {};
  if (fs.existsSync(tenantConfigPath)) {
    try {
      const tenantContent = fs.readFileSync(tenantConfigPath, "utf-8");
      tenantConfig = JSON5.parse(tenantContent);
    } catch (e) {
      console.warn(
        `[Config] Failed to parse tenantConfig for ${tenantId}, using default.`
      );
    }
  }

  // 3. 智能合并逻辑 (Inheritance)
  const mergedConfig: SchoolConfig = {
    ...entityConfig,
    tenantId: tenantId, // 👈 强制覆盖：确保使用正确的租户 ID
    entityType: entityType as any, // 👈 强制覆盖：确保实体类型一致
    schoolName:
      entityConfig.schoolName || tenantConfig.schoolName || "未命名学校",
  };

  // 初始化 dataSource.config 确保不为 undefined
  if (!mergedConfig.dataSource.config) {
    mergedConfig.dataSource.config = {} as any;
  }

  // 4. 数据源合并优先级：实体配置 (Entity) > 租户共享配置 (Tenant)
  const common = tenantConfig.commonConfig || {};

  if (mergedConfig.dataSource.type === "db") {
    const dbConfig = mergedConfig.dataSource.config;
    // 只有当实体配置中该项为空或未定义时，才回退到租户共享配置
    dbConfig.dbType = dbConfig.dbType || common.dbType;
    dbConfig.connectionString =
      dbConfig.connectionString || common.dbConnection;

    console.log(
      `[Config] DB Source for ${tenantId}:${entityType} merged. Connection: ${
        dbConfig.connectionString ? "Present" : "Empty"
      }`
    );
  } else if (mergedConfig.dataSource.type === "api") {
    const apiConfig = mergedConfig.dataSource.config;
    // API Base URL 拼接逻辑
    if (common.apiBaseUrl && apiConfig.url && apiConfig.url.startsWith("/")) {
      apiConfig.url = `${common.apiBaseUrl}${apiConfig.url}`;
    }
    // Header/Token 注入
    if (common.apiAuthToken) {
      apiConfig.headers = {
        Authorization: `Bearer ${common.apiAuthToken}`,
        ...apiConfig.headers,
      };
    }
  }

  return mergedConfig;
}

/**
 * 获取租户下所有可用的实体类型（固定返回 5 个标准实体）
 */
export function getAvailableEntities(tenantId: string): string[] {
  // 不再只根据磁盘文件返回，而是强制返回 5 个标准类型
  return [
    "teacher",
    "student",
    "teacherOrganizations",
    "studentOrganizations",
    "class",
  ];
}

/**
 * 获取所有已配置的租户
 */
export function getAvailableTenants(): string[] {
  if (!fs.existsSync(CONFIG_BASE_PATH)) return [];
  return fs
    .readdirSync(CONFIG_BASE_PATH)
    .filter((file) =>
      fs.statSync(path.join(CONFIG_BASE_PATH, file)).isDirectory()
    );
}
