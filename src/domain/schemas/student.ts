import { z } from "zod";

export const studentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  phone: z.string().optional(),
  code: z.string().min(1),
  year: z.number().int().optional(),
  classId: z.string().min(1),
  educateLevel: z.string().optional(),
});

