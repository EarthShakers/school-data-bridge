import { z } from "zod";
import { teacherSchema } from "./teacher";
import { studentSchema } from "./student";
import { teacherOrganizationsSchema } from "./teacherOrganizations";
import { studentOrganizationsSchema } from "./studentOrganizations";
import { classSchema } from "./class";
import { EntityType } from "../../types";

export const schemas: Record<EntityType, z.ZodSchema> = {
  teacher: teacherSchema,
  student: studentSchema,
  teacherOrganizations: teacherOrganizationsSchema,
  studentOrganizations: studentOrganizationsSchema,
  class: classSchema,
};

export {
  teacherSchema,
  studentSchema,
  teacherOrganizationsSchema,
  studentOrganizationsSchema,
  classSchema,
};
