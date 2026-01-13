import { DataEnvelope, SchoolConfig } from "../types";
import { converters } from "../mapping/converterFn";
import { schemas } from "../domain/schemas"; // 👈 修改：从 domain/schemas 导入

// Use require because node-json-transform doesn't have good TS types
const { transform } = require("node-json-transform");

export async function transformAndValidate(
  envelope: DataEnvelope,
  config: SchoolConfig
): Promise<{ allRecords: any[]; successCount: number; failedCount: number }> {
  const { rawData, tenantId, traceId } = envelope;
  const { fieldMap, entityType } = config;

  // 根据实体类型获取对应的 Zod Schema
  const schema = schemas[entityType];
  if (!schema) {
    throw new Error(`[Pipeline] No schema found for entityType: ${entityType}`);
  }

  // 1. 构造 node-json-transform 标准配置
  const item: any = {};
  const operate: any[] = [];

  if (!fieldMap || fieldMap.length === 0) {
    console.error(
      `[Pipeline] ❌ FATAL: fieldMap is empty for ${tenantId}:${entityType}`
    );
  }

  // 🔧 增强：字段名不区分大小写，统一转大写匹配
  const normalizedFieldMap = (fieldMap || []).map((fm) => ({
    ...fm,
    sourceField: fm.sourceField?.toUpperCase(),
  }));

  normalizedFieldMap.forEach((fm) => {
    // 映射基础字段名 (Key 是目标，Value 是源路径 - 已经大写化)
    item[fm.targetField] = fm.sourceField;

    // 如果有自定义转换逻辑，放入 operate 队列
    if (fm.converter && fm.converter !== "default") {
      operate.push({
        run: (value: any) => {
          const converter = converters[fm.converter] || converters.default;
          return converter(value, fm.converterConfig || {});
        },
        on: fm.targetField,
      });
    }
  });

  const transformMap = {
    item,
    operate,
    // 在转换前过滤掉不符合条件的原始记录
    filter: (rawItem: any) => {
      // 同样对 rawItem 的 Key 做大写化处理后再过滤
      const upperRawItem: any = {};
      Object.keys(rawItem).forEach(
        (k) => (upperRawItem[k.toUpperCase()] = rawItem[k])
      );

      return normalizedFieldMap.every(
        (fm) =>
          !fm.required ||
          (upperRawItem[fm.sourceField] !== undefined &&
            upperRawItem[fm.sourceField] !== null)
      );
    },
  };

  // 2. 执行转换
  const rawDataArray = Array.isArray(rawData)
    ? rawData.length > 0
      ? rawData
      : []
    : [rawData];

  if (rawDataArray.length === 0) {
    console.warn(`[Pipeline] ⚠️ No data to transform for ${tenantId}`);
    return { allRecords: [], successCount: 0, failedCount: 0 };
  }

  // 🔧 核心：将原始数据的所有 Key 统一转为大写，以支持不区分大小写的匹配
  const dataToTransform = rawDataArray.map((row: any) => {
    if (!row || typeof row !== "object") return row;
    const upperRow: any = {};
    Object.keys(row).forEach((k) => (upperRow[k.toUpperCase()] = row[k]));
    return upperRow;
  });

  const transformedData = transform(dataToTransform, transformMap);

  // 3. Zod 验证
  const allRecords: any[] = [];

  transformedData.forEach((item: any, index: number) => {
    const validation = schema.safeParse(item);
    if (validation.success) {
      // 🔧 增强：剔除值为 undefined 的 Key，并将状态设为待写入
      const cleanData = JSON.parse(JSON.stringify(validation.data));

      allRecords.push({
        ...cleanData,
        _importStatus: "pending_write", // 👈 改为待写入，而不是直接成功
        _metadata: { traceId, tenantId, index },
      });
    } else {
      // 🔧 改进：增加 [数据校验] 前缀
      allRecords.push({
        ...item,
        _importStatus: "failed",
        _importError: `[数据校验] ${JSON.stringify(validation.error.format())}`,
        _metadata: { traceId, tenantId, index },
      });
    }
  });

  const successCount = allRecords.filter(
    (r) => r._importStatus === "success"
  ).length;
  const failedCount = allRecords.length - successCount;

  console.log(
    `[Pipeline] ${tenantId} processed: ${successCount} success, ${failedCount} failed.`
  );

  return { allRecords, successCount, failedCount };
}
