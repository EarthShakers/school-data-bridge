import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { SchoolConfig, DataEnvelope } from "../types";
import { studentMockData, teacherMockData } from "../../mock";

export async function fetchFromExternalApi(
  config: SchoolConfig
): Promise<DataEnvelope> {
  const { dataSource, tenantId } = config;
  const { url, method = "GET", headers = {}, params = {} } = dataSource.config;

  const traceId = uuidv4();

  // 🧪 Mock 逻辑：如果没有真实 URL 或使用了测试域名，返回 Mock 数据
  if (!url || url.includes("example.com")) {
    console.log(
      `[ApiAdapter] 🧪 Using mock data for ${tenantId} (${config.entityType})`
    );

    if (config.entityType === "student") {
      return {
        traceId,
        tenantId,
        rawData: studentMockData,
      };
    }

    return {
      traceId,
      tenantId,
      rawData: teacherMockData,
    };
  }

  try {
    const response = await axios({
      url,
      method,
      headers,
      params,
    });

    return {
      traceId,
      tenantId,
      rawData: response.data,
    };
  } catch (error: any) {
    console.error(
      `[ApiAdapter] Failed to fetch data for ${tenantId}:`,
      error.message
    );
    throw error;
  }
}
