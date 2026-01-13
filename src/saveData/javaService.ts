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
  batchDetails: {
    batchIndex: number;
    payload: any;
    response: any;
    status: "success" | "failed";
  }[];
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
  const batchDetails: JavaWriteResult["batchDetails"] = [];

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
      let status: "success" | "failed" = "success";
      let resData: any = null;

      try {
        payload = {
          [wrapperKey]: batch,
        };

        if (entityType === "class" || entityType === "studentOrganizations") {
          payload.batchId = `batch_${Date.now()}_${index}`;
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

        resData = response.data;

        if (
          resData &&
          resData.code &&
          !["200", "0", "success"].includes(String(resData.code))
        ) {
          status = "failed";
          throw new Error(`Java 业务错误: ${resData.message || "未知原因"}`);
        }

        // 处理部分成功部分失败 (Java 接口返回 data 数组的情况)
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
          if (failedInJava > 0) status = "failed";
        } else {
          successCount += batch.length;
        }
      } catch (error: any) {
        status = "failed";
        failedCount += batch.length;
        const errMsg = error.response?.data?.message || error.message;
        resData = error.response?.data || error.message;

        batch.forEach((item: any) => {
          allErrors.push({
            id: item.id || "batch-error",
            message: `Java 接口失败: ${errMsg}`,
          });
        });
      } finally {
        batchDetails.push({
          batchIndex: index + 1,
          payload,
          response: resData,
          status,
        });
      }
    });
  });

  await Promise.all(tasks);
  return {
    success: successCount,
    failed: failedCount,
    errors: allErrors,
    batchDetails,
  };
}
