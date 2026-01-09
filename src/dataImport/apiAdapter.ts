import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { SchoolConfig, DataEnvelope } from "../types";
import { studentMockData, teacherMockData } from "../../mock";

export async function fetchFromExternalApi(
  config: SchoolConfig
): Promise<DataEnvelope> {
  if (config.dataSource.type !== "api") {
    throw new Error("[ApiAdapter] Invalid dataSource type");
  }

  const { dataSource, tenantId, entityType } = config;
  const {
    url,
    method = "GET",
    headers = {},
    params = {},
    pagination,
  } = dataSource.config;

  const traceId = uuidv4();

  console.log(`[ApiAdapter] 🌐 Fetching from API for ${tenantId || 'Unknown'}:${entityType || 'Unknown'} -> ${url}`);

  // 严格校验 URL，不再静默进入 Mock
  if (!url || url.includes("example.com")) {
    throw new Error(`[ApiAdapter] ❌ 无效的 API URL: ${url || "空"}。请在配置中设置真实的接口地址。`);
  }

  try {
    const finalParams = { ...params };

    if (pagination) {
      const currentPage = pagination.startPage || 1;
      finalParams[pagination.pageParam] = currentPage;
      finalParams[pagination.sizeParam] = pagination.pageSize;
      console.log(
        `[ApiAdapter] 📄 Fetching page ${currentPage} (size: ${pagination.pageSize}) for ${tenantId}`
      );
    }

    const response = await axios({
      url,
      method,
      headers,
      params: finalParams,
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
