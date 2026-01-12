import { z } from "zod";

/**
 * 学生组织（班级/院系）校验 Schema
 */
export const studentOrganizationsSchema = z.object({
  // 兼容数据库返回的 BigInt/Number 类型，自动转为字符串
  id: z.preprocess((val) => String(val), z.string().min(1)),
  name: z.string().min(1),
  // 允许 pid 为 null
  pid: z.preprocess(
    (val) => (val === null || val === undefined ? null : String(val)),
    z.string().nullable()
  ),
  // 兼容字符串形式的年份
  year: z.preprocess((val) => {
    if (val === null || val === undefined || val === "") return undefined;
    const n = Number(val);
    return isNaN(n) ? undefined : n;
  }, z.number().int().optional()),
  code: z.string().optional(),
});
