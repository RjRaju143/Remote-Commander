import { z } from 'zod';
import { ObjectId } from 'mongodb';

export const ServerSchema = z.object({
  name: z.string().min(1, 'Server name is required.'),
  ip: z.string().ip({ version: 'v4', message: 'Invalid IP address.' }),
  port: z.coerce.number().min(1).max(65535),
  username: z.string().min(1, 'Username is required.'),
  privateKey: z.string().optional(),
  ownerId: z.instanceof(ObjectId).optional(),
  guestIds: z.array(z.instanceof(ObjectId)).optional(),
});

export type ServerModel = z.infer<typeof ServerSchema>;
