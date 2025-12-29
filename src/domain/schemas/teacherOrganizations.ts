import { z } from "zod";

export const teacherOrganizationsSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  pid: z.string().optional(),
});

