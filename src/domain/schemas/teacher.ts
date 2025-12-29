import { z } from "zod";

export const teacherSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  phone: z.string().optional(),
  gender: z.enum(["male", "female", "unknown"]).optional(),
  code: z.string().min(1),
  email: z.string().email().optional(),
  role: z.string().optional(),
  orgClientIds: z.array(z.string()).min(1),
  customFields: z.record(z.any()).optional(),
});

