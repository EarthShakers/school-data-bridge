export interface SchoolConfig {
  tenantId: string;
  schoolName: string;
  entityType: "teacher" | "student" | "teacherOrganizations"; // 新增：实体类型
  dataSource: {
    type: "api" | "webhook" | "db";
    config: {
      url?: string;
      method?: string;
      headers?: Record<string, string>;
      [key: string]: any;
    };
  };
  fieldMap: FieldMapItem[];
  batchConfig: {
    batchSize: number;
    retryTimes: number;
  };
}

export interface FieldMapItem {
  sourceField: string;
  targetField: string;
  converter: string;
  converterConfig?: Record<string, any>;
  required?: boolean;
}

export interface DataEnvelope<T = any> {
  traceId: string;
  tenantId: string;
  rawData: T;
}

export interface StandardizedData {
  traceId: string;
  tenantId: string;
  data: any[];
}
