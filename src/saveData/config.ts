import { EntityType } from "../types";
import { metadataDb } from "../utils/metadataDb";

export interface EnvironmentConfig {
  id: string;
  name: string;
  url: string;
}

/**
 * 获取实时环境配置列表（从数据库读取）
 */
export async function getSystemEnvironments(): Promise<EnvironmentConfig[]> {
  try {
    const envs = await metadataDb("bridge_system_environments").select("*");
    if (envs && envs.length > 0) {
      return envs;
    }
  } catch (e) {
    console.error("[Config] Failed to fetch environments from DB:", e);
  }

  // 回退默认值
  return [
    { id: "dev", name: "开发环境 (Dev)", url: process.env.JAVA_USER_SERVICE_BASE_URL_DEV || "http://localhost:8080" },
    { id: "test", name: "测试环境 (Test)", url: process.env.JAVA_USER_SERVICE_BASE_URL_TEST || "http://test-api.example.com" },
    { id: "prod", name: "生产环境 (Prod)", url: process.env.JAVA_USER_SERVICE_BASE_URL_PROD || "https://api.example.com" },
  ];
}

export const baseConfig = {
  JAVA_USER_SERVICE_TIMEOUT: 30000,
  DEFAULT_BATCH_SIZE: 100,
  DEFAULT_RETRY_TIMES: 3,
  MAX_GLOBAL_CONCURRENCY: 10,
  LOG_LEVEL: "info",
  LOG_FILE_PATH: "./logs/import/",
};

/**
 * 根据实体类型和目标环境 ID 获取 Java 写入接口地址
 */
export async function getEndpointForEntity(
  entityType: EntityType,
  envId: string = "dev"
): Promise<string> {
  const envs = await getSystemEnvironments();
  const targetEnv = envs.find(e => e.id === envId) || envs[0];
  const base = targetEnv.url;

  const map: Record<EntityType, string> = {
    teacher: `${base}/v1/base/teacher/batch`,
    student: `${base}/v1/base/stu/batch`,
    teacherOrganizations: `${base}/v1/base/teacher/org/batch`,
    studentOrganizations: `${base}/v1/base/stu/org/batch`,
    class: `${base}/v1/base/course-class/batch`,
  };
  return map[entityType] || `${base}/v1/base/data/batch`;
}
