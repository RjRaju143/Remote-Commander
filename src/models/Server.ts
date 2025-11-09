import { z } from 'zod';
import { ObjectId } from 'mongodb';

export const ServerSchema = z.object({
  name: z.string().min(1, 'Server name is required.'),
  ip: z.string().min(1, 'Server address is required.').refine(
    (val) => {
      // Check if it's a valid IP address (IPv4 or IPv6)
      const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;
      // Check if it's a valid domain name
      const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?))*$/;
      return ipRegex.test(val) || domainRegex.test(val);
    },
    { message: 'Invalid IP address or domain name.' }
  ),
  port: z.coerce.number().min(1).max(65535),
  username: z.string().min(1, 'Username is required.'),
  privateKey: z.string().optional(),
  ownerId: z.instanceof(ObjectId).optional(),
  guestIds: z.array(z.instanceof(ObjectId)).optional(),
});

export type ServerModel = z.infer<typeof ServerSchema>;
