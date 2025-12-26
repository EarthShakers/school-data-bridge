import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { SchoolConfig, DataEnvelope } from "../types";

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
        rawData: [
          { id: "S001", name: "小明", stu_no: "2023001", class_id: "class_a" },
          { id: "S002", name: "小红", stu_no: "2023002", class_id: "class_a" },
        ],
      };
    }

    return {
      traceId,
      tenantId,
      rawData: [
        { ID: "T001", XM: "张三", GH: "1001", ORG_IDS: ["dept1"], XB: "1" },
        { ID: "T002", XM: "李四", GH: "1002", ORG_IDS: ["dept1"], XB: "0" },
        { ID: "T003", XM: "王五", GH: "1003", ORG_IDS: ["dept2"], XB: "1" },
        { ID: "T004", XM: "无效性别", GH: "1004", ORG_IDS: ["dept2"], XB: "9" },
        { ID: "T005", GH: "1005", ORG_IDS: ["dept1"], XB: "1" }, // 缺失 XM (name)，将被过滤
      ],
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
