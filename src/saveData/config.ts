export const baseConfig = {
  JAVA_USER_SERVICE_BASE_URL: "http://java-user-service:8080",
  JAVA_USER_SERVICE_TOKEN: "your_java_service_auth_token",
  JAVA_USER_SERVICE_TIMEOUT: 30000,
  DEFAULT_BATCH_SIZE: 100,
  DEFAULT_RETRY_TIMES: 3,
  MAX_GLOBAL_CONCURRENCY: 10,
  LOG_LEVEL: "info",
  LOG_FILE_PATH: "./logs/import/",
};

/**
 * 根据实体类型获取 Java 写入接口地址
 */
export function getEndpointForEntity(entityType: string): string {
  const base = baseConfig.JAVA_USER_SERVICE_BASE_URL;
  const map: Record<string, string> = {
    teacher: `${base}/v1/base/teacher/batch`,
    student: `${base}/v1/base/stu/batch`,
    teacherOrganizations: `${base}/v1/base/teacher/org/batch`,
    studentOrganizations: `${base}/v1/base/stu/org/batch`,
    class: `${base}/v1/base/class/batch`,
  };
  return map[entityType] || `${base}/v1/base/data/batch`;
}
