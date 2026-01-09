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

  const wrapperMap: Record<EntityType, string> = {
    teacher: "teachers",
    student: "stus",
    teacherOrganizations: "teacherOrganizations",
    studentOrganizations: "stuClasses",
    class: "courseClasses",
  };

  const wrapperKey = wrapperMap[entityType] || "data";

  // 分批次
  const batches = [];
  for (let i = 0; i < data.length; i += batchSize) {
    batches.push(data.slice(i, i + batchSize));
  }

  const tasks = batches.map((batch, index) => {
    return limit(async () => {
      try {
        const payload: any = {
          [wrapperKey]: batch,
        };

        // 统一处理可能需要的批次 ID (有些接口虽然文档没写，但后端可能是统一拦截器要求的)
        if (entityType === "class" || entityType === "studentOrganizations") {
          payload.batchId = `batch_${Date.now()}`;
          payload.semesterId = "default";
        }

        // 🚀 调试日志：打印发送的详情
        if (index === 0) {
          console.log(`[JavaWriter] 🛰 Sending to: ${javaEndpoint}`);
          console.log(
            `[JavaWriter] 📦 Payload sample (1st record):`,
            JSON.stringify(batch[0])
          );
        }

        const response = await axios.post(javaEndpoint, payload, {
          headers: {
            "Content-Type": "application/json",
            Authorization: authToken || "",
          },
          timeout: baseConfig.JAVA_USER_SERVICE_TIMEOUT,
        });

        const resData = response.data;

        // 检查业务层面的 code (有些接口 200 但 code 是 error)
        if (
          resData &&
          resData.code &&
          resData.code !== "200" &&
          resData.code !== "0" &&
          resData.code !== "success"
        ) {
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
          console.log(
            `[JavaWriter] Batch ${index + 1}/${
              batches.length
            } successfully accepted by Java.`
          );
        }
      } catch (error: any) {
        failedCount += batch.length;
        const errMsg = error.response?.data?.message || error.message;
        batch.forEach((item: any) => {
          allErrors.push({
            id: item.id || "batch-error",
            message: `Java 接口调用失败: ${errMsg}`,
          });
        });
        console.error(`[JavaWriter] ❌ Batch ${index + 1} Failed:`, errMsg);
      }
    });
  });

  await Promise.all(tasks);
  return { success: successCount, failed: failedCount, errors: allErrors };
}
