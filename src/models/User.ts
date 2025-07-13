
import { z } from 'zod';
import { ObjectId } from 'mongodb';

export const UserSchema = z.object({
  _id: z.union([z.instanceof(ObjectId), z.string()]),
  email: z.string().email(),
  password: z.string().optional(), // Password is not always present, e.g., when fetching current user
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

export type User = z.infer<typeof UserSchema>;
