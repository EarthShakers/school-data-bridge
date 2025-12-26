import { z } from "zod";

// 1. 教师/教职工 Schema
export const teacherSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  phone: z.string(),
  gender: z.enum(["male", "female", "unknown"]).optional(),
  code: z.string().min(1),
  email: z.string().email().optional(),
  role: z.string().optional(),
  orgClientIds: z.array(z.string()).min(1),
  customFields: z.record(z.any()).optional(),
});

// 2. 学生 Schema
export const studentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  phone: z.string().optional(),
  code: z.string().min(1),
  year: z.number().int().optional(),
  classId: z.string().min(1),
  educateLevel: z.string().optional(),
});

// 3. 教职工组织架构 Schema
export const teacherOrganizationsSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  pid: z.string().optional(),
});

// 4. 学生组织架构 Schema
export const studentOrganizationsSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  pid: z.string().optional(),
  year: z.number().int(),
  code: z.string().optional(),
});

// 5. 教学班 Schema
export const classSchema = z.object({
  id: z.string().min(1),
  semesterId: z.string().min(1),
  courseCode: z.string().optional(),
  leader: z.string().optional(),
  name: z.string().min(1),
  code: z.string().optional(),
  teachers: z.array(z.string()),
  stuCodes: z.array(z.string()),
  scoredTeacher: z.string().optional(),
});

// 导出所有 Schema 的映射，方便 Pipeline 调用
export const schemas: Record<string, z.ZodSchema> = {
  teacher: teacherSchema,
  student: studentSchema,
  teacherOrganizations: teacherOrganizationsSchema,
  studentOrganizations: studentOrganizationsSchema,
  class: classSchema,
};
