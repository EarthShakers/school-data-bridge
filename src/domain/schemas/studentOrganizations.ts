import { z } from "zod";

export const studentOrganizationsSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  pid: z.string().optional(),
  year: z.number().int(),
  code: z.string().optional(),
});

