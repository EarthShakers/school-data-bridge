import axios from "axios";
import pLimit from "p-limit";
import { baseConfig } from "./config";
import { EntityType } from "../types";

export interface WriteOptions {
  batchSize: number;
  concurrency: number;
  javaEndpoint: string;
  authToken?: string;
  entityType: EntityType;
}

export interface JavaWriteResult {
  success: number;
  failed: number;
  errors: { id: string; message: string }[];
  debugInfo?: {
    lastPayload: any;
    lastResponse: any;
  };
}

/**
 * 写入 Java 服务
 */
export async function writeToInternalJavaService(
  data: any[],
  options: WriteOptions
): Promise<JavaWriteResult> {
  const { batchSize, concurrency, javaEndpoint, authToken, entityType } =
    options;
  const limit = pLimit(concurrency);

  let successCount = 0;
  let failedCount = 0;
  const allErrors: { id: string; message: string }[] = [];
  let debugInfo: any = null;

  const wrapperMap: Record<EntityType, string> = {
    teacher: "teachers",
    student: "stus",
    teacherOrganizations: "teacherOrganizations",
    studentOrganizations: "stuClasses",
    class: "courseClasses",
  };

  const wrapperKey = wrapperMap[entityType] || "data";

  const batches = [];
  for (let i = 0; i < data.length; i += batchSize) {
    batches.push(data.slice(i, i + batchSize));
  }

  const tasks = batches.map((batch, index) => {
    return limit(async () => {
      let payload: any = null;
      try {
        payload = {
          [wrapperKey]: batch,
        };

        if (entityType === "class" || entityType === "studentOrganizations") {
          payload.batchId = `batch_${Date.now()}`;
          payload.semesterId = "default";
        }

        const response = await axios.post(javaEndpoint, payload, {
          headers: {
            "Content-Type": "application/json",
            Authorization: authToken || "",
            "client-secret": "8140234792347023482",
          },
          timeout: baseConfig.JAVA_USER_SERVICE_TIMEOUT,
        });

        const resData = response.data;

        if (
          resData &&
          resData.code &&
          resData.code !== "200" &&
          resData.code !== "0" &&
          resData.code !== "success"
        ) {
          // 业务错误，记录 debug 信息
          debugInfo = { lastPayload: payload, lastResponse: resData };
          throw new Error(`Java 业务错误: ${resData.message || "未知原因"}`);
        }

        if (resData && Array.isArray(resData.data) && resData.data.length > 0) {
          resData.data.forEach((err: any) => {
            allErrors.push({
              id: err.id || "unknown",
              message: Array.isArray(err.messages)
                ? err.messages.join("; ")
                : "业务校验失败",
            });
          });

          const failedInJava = resData.data.length;
          failedCount += failedInJava;
          successCount += batch.length - failedInJava;
        } else {
          successCount += batch.length;
        }
      } catch (error: any) {
        failedCount += batch.length;
        const errMsg = error.response?.data?.message || error.message;

        // 捕获网络或协议级错误的 Debug 信息
        if (!debugInfo) {
          debugInfo = {
            lastPayload: payload,
            lastResponse: error.response?.data || error.message,
          };
        }

        batch.forEach((item: any) => {
          allErrors.push({
            id: item.id || "batch-error",
            message: `Java 接口失败: ${errMsg}`,
          });
        });
      }
    });
  });

  await Promise.all(tasks);
  return {
    success: successCount,
    failed: failedCount,
    errors: allErrors,
    debugInfo,
  };
}
