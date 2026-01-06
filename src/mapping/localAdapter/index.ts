import fs from "fs";
import path from "path";
import JSON5 from "json5";
import { EntityType, SchoolConfig } from "../../types";

const CONFIG_BASE_PATH = path.join(process.cwd(), "config", "schools");

/**
 * 获取特定租户下特定实体的配置
 */
export async function getSchoolConfig(
  tenantId: string,
  entityType: EntityType
): Promise<SchoolConfig> {
  const configPath = path.join(
    CONFIG_BASE_PATH,
    tenantId,
    `${entityType}.json5`
  );

  if (!fs.existsSync(configPath)) {
    throw new Error(
      `[Config] Configuration not found for tenant: ${tenantId}, entity: ${entityType} at ${configPath}`
    );
  }

  const configContent = fs.readFileSync(configPath, "utf-8");
  return JSON5.parse(configContent);
}

/**
 * 获取租户下所有可用的实体类型
 */
export function getAvailableEntities(tenantId: string): string[] {
  const tenantPath = path.join(CONFIG_BASE_PATH, tenantId);
  if (!fs.existsSync(tenantPath)) return [];

  return fs
    .readdirSync(tenantPath)
    .filter((file) => file.endsWith(".json5"))
    .map((file) => file.replace(".json5", ""));
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
