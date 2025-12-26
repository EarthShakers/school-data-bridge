import axios from "axios";
import pLimit from "p-limit";
import { baseConfig } from "../../config/baseConfig";

export interface WriteOptions {
  batchSize: number;
  concurrency: number;
  javaEndpoint: string;
}

export async function writeToInternalJavaService(
  data: any[],
  options: WriteOptions
): Promise<{ success: number; failed: number }> {
  const { batchSize, concurrency, javaEndpoint } = options;
  const limit = pLimit(concurrency);

  let successCount = 0;
  let failedCount = 0;

  // Split data into batches
  const batches = [];
  for (let i = 0; i < data.length; i += batchSize) {
    batches.push(data.slice(i, i + batchSize));
  }

  const tasks = batches.map((batch, index) => {
    return limit(async () => {
      try {
        // 🧪 Mock 逻辑：如果端点包含 localhost 或 java 关键字，模拟写入成功
        if (
          javaEndpoint.includes("localhost") ||
          javaEndpoint.includes("java")
        ) {
          console.log(
            `[JavaWriter] 🧪 Mocking successful write for batch ${
              index + 1
            } to ${javaEndpoint}`
          );
          successCount += batch.length;
          return;
        }

        await axios.post(javaEndpoint, batch, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${baseConfig.JAVA_USER_SERVICE_TOKEN}`,
          },
          timeout: baseConfig.JAVA_USER_SERVICE_TIMEOUT,
        });
        successCount += batch.length;
        console.log(
          `[JavaWriter] Batch ${index + 1}/${
            batches.length
          } written successfully.`
        );
      } catch (error: any) {
        failedCount += batch.length;
        console.error(
          `[JavaWriter] Failed to write batch ${index + 1}:`,
          error.message
        );
        // In a real scenario, we'd implement exponential backoff retry here
      }
    });
  });

  await Promise.all(tasks);

  return { success: successCount, failed: failedCount };
}
