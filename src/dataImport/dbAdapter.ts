import { v4 as uuidv4 } from "uuid";
import { SchoolConfig, DataEnvelope } from "../types";

export async function fetchFromDb(config: SchoolConfig): Promise<DataEnvelope> {
  const { dataSource, tenantId } = config;
  const { url, method = "GET", headers = {}, params = {} } = dataSource.config;

  const traceId = uuidv4();

  return {
    traceId,
    tenantId,
    rawData: [],
  };
}
