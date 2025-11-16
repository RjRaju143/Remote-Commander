import { z } from 'zod';
import { ObjectId } from 'mongodb';

export const OrganizationSchema = z.object({
  _id: z.union([z.instanceof(ObjectId), z.string()]).optional(),
  name: z.string().min(1, 'Organization name is required'),
  employeeCount: z.enum(['0-50', '50-100', '100-500', '500+']),
  role: z.string().min(1, 'Role is required'),
  userId: z.union([z.instanceof(ObjectId), z.string()]),
  createdAt: z.date().optional(),
});

export type Organization = z.infer<typeof OrganizationSchema>;
