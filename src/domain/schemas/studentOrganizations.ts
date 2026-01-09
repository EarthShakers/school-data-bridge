import { z } from "zod";

export const studentOrganizationsSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  pid: z.string().nullable().optional(), // 允许数据库返回 null
  year: z.preprocess((val) => Number(val), z.number().int()), // 自动把字符串 "0" 转成数字 0
  code: z.string().optional(),
});
