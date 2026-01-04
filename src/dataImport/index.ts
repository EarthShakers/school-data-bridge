// 数据源抓取适配器，统一接口，标准化输出；支持 API、DB 两种数据源。

import { fetchFromExternalApi } from "./apiAdapter";
import { fetchFromDb } from "./dbAdapter";
import { SchoolConfig, DataEnvelope } from "../types";

export * from "./apiAdapter";
export * from "./dbAdapter";

/**
 * 统一的数据抓取入口，根据配置类型自动路由
 */
export async function fetchData(config: SchoolConfig): Promise<DataEnvelope> {
  const type = config.dataSource.type;

  switch (type) {
    case "api":
      return fetchFromExternalApi(config);
    case "db":
      return fetchFromDb(config);
    default:
      throw new Error(`[DataImport] Unsupported dataSource type: ${type}`);
  }
}
