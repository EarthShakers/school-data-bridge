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

  fieldMap.forEach((fm) => {
    // 映射基础字段名 (Key 是目标，Value 是源路径)
    item[fm.targetField] = fm.sourceField;

    // 如果有自定义转换逻辑，放入 operate 队列 (通过 run 处理值，通过 on 指定目标字段)
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
      return fieldMap.every(
        (fm) =>
          !fm.required ||
          (rawItem[fm.sourceField] !== undefined &&
            rawItem[fm.sourceField] !== null)
      );
    },
  };

  // 2. 执行转换
  const dataToTransform = Array.isArray(rawData) ? rawData : [rawData];
  const transformedData = transform(dataToTransform, transformMap);

  // 3. Zod 验证
  const allRecords: any[] = [];

  if (transformedData.length > 0) {
    console.log(`[Pipeline] Sample transformed item (before Zod):`, JSON.stringify(transformedData[0], null, 2));
  }

  transformedData.forEach((item: any, index: number) => {
    const validation = schema.safeParse(item);
    if (validation.success) {
      allRecords.push({
        ...validation.data,
        _importStatus: "success",
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
