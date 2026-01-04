export interface SchoolConfig {
  tenantId: string;
  schoolName: string;
  entityType:
    | "teacher"
    | "student"
    | "teacherOrganizations"
    | "studentOrganizations"
    | "class";
  dataSource: ApiDataSource | DbDataSource | WebhookDataSource;
  fieldMap: FieldMapItem[];
  batchConfig: {
    batchSize: number;
    retryTimes: number;
  };
}

export interface ApiDataSource {
  type: "api";
  config: {
    url: string;
    method?: "GET" | "POST";
    headers?: Record<string, string>;
    params?: Record<string, any>;
  };
}

export interface DbDataSource {
  type: "db";
  config: {
    dbType: "mysql" | "postgresql" | "oracle" | "sqlserver";
    connectionString: string;
    viewName?: string;
    sql?: string;
    modelName?: string;
  };
}

export interface WebhookDataSource {
  type: "webhook";
  config: {
    endpoint: string;
    secret?: string;
    [key: string]: any;
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
