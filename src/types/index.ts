export interface SchoolConfig {
  tenantId: string;
  schoolName: string;
  entityType: EntityType;
  dataSource: ApiDataSource | DbDataSource | WebhookDataSource;
  fieldMap: FieldMapItem[];
  batchConfig: {
    batchSize: number;
    retryTimes: number;
  };
  syncConfig?: {
    enabled?: boolean;
    cron?: string; // Cron 表达式，如 "0 2 * * *"
    priority?: number; // 优先级
    environment?: string; // 自动调度时的目标环境
  };
  javaAuthToken?: string; // Java 写入服务的鉴权 Token
}

export type EntityType =
  | "teacher"
  | "student"
  | "teacherOrganizations"
  | "studentOrganizations"
  | "class";

export interface ApiDataSource {
  type: "api";
  config: {
    url: string;
    method?: "GET" | "POST";
    headers?: Record<string, string>;
    params?: Record<string, any>;
    pagination?: {
      pageParam: string; // 页码参数名，如 "page"
      sizeParam: string; // 每页数量参数名，如 "limit"
      pageSize: number; // 每页大小
      startPage?: number; // 起始页码，默认 1
    };
  };
}

export interface DbDataSource {
  type: "db";
  config: {
    dbType: "mysql" | "postgresql" | "oracle" | "sqlserver";
    connectionString?: string;
    host?: string;
    port?: number | string;
    user?: string;
    password?: string;
    database?: string;
    sid?: string; // Oracle SID
    viewName?: string;
    sql?: string;
    modelName?: string;
    batchSize?: number; // 数据库抓取批次大小
    offset?: number; // 数据库抓取偏移量
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
