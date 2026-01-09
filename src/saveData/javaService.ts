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

  // 根据实体类型确定包装的 Key
  const wrapperMap: Record<EntityType, string> = {
    teacher: "teachers",
    student: "stus",
    teacherOrganizations: "teacherOrganizations",
    studentOrganizations: "stuClasses",
    class: "courseClasses",
  };

  const wrapperKey = wrapperMap[entityType] || "data";

  // Split data into batches
  const batches = [];
  for (let i = 0; i < data.length; i += batchSize) {
    batches.push(data.slice(i, i + batchSize));
  }

  const tasks = batches.map((batch, index) => {
    return limit(async () => {
      try {
        // 构造 Java 要求的包装格式
        const payload: any = {
          [wrapperKey]: batch,
        };

        // 特殊处理：教学班接口可能需要额外的 batchId 和 semesterId
        if (entityType === "class") {
          payload.batchId = `batch_${Date.now()}`;
          payload.semesterId = "default";
        }

        const response = await axios.post(javaEndpoint, payload, {
          headers: {
            "Content-Type": "application/json",
            Authorization: authToken || "",
          },
          timeout: baseConfig.JAVA_USER_SERVICE_TIMEOUT,
        });

        // 检查响应逻辑：Java 接口通常返回 200，但 data 字段包含失败详情
        const resData = response.data;
        if (resData && Array.isArray(resData.data) && resData.data.length > 0) {
          // Java 侧返回了未通过的记录详情
          resData.data.forEach((err: any) => {
            allErrors.push({
              id: err.id || "unknown",
              message: Array.isArray(err.messages)
                ? err.messages.join("; ")
                : "Java 业务校验未通过",
            });
          });

          const failedInJava = resData.data.length;
          failedCount += failedInJava;
          successCount += batch.length - failedInJava;
          console.warn(
            `[JavaWriter] Batch ${
              index + 1
            } partially saved. ${failedInJava} records rejected by Java.`
          );
        } else {
          successCount += batch.length;
          console.log(
            `[JavaWriter] Batch ${index + 1}/${
              batches.length
            } written successfully.`
          );
        }
      } catch (error: any) {
        failedCount += batch.length;
        const errMsg = error.response?.data?.message || error.message;

        // 记录整批失败的原因
        batch.forEach((item: any) => {
          allErrors.push({
            id: item.id || "batch-error",
            message: `Java 接口调用失败: ${errMsg}`,
          });
        });

        console.error(
          `[JavaWriter] Failed to write batch ${index + 1}:`,
          errMsg
        );
      }
    });
  });

  await Promise.all(tasks);

  return { success: successCount, failed: failedCount, errors: allErrors };
}
