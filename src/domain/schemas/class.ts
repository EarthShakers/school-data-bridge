import { z } from "zod";

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

