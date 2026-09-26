import { z } from 'zod';
import { requiredString } from './common';

export const departmentCreateSchema = z.object({
  nazwa: requiredString('Nazwa działu', 100),
});
export type DepartmentCreateInput = z.infer<typeof departmentCreateSchema>;

export const departmentUpdateSchema = departmentCreateSchema.partial();
export type DepartmentUpdateInput = z.infer<typeof departmentUpdateSchema>;
