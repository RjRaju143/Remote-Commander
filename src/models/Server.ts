
import { z } from 'zod';
import { ObjectId } from 'mongodb';

export const ServerSchema = z.object({
  name: z.string().min(1, 'Server name is required.'),
  ip: z.string().min(1, 'Server address is required.').refine(
    (val) => {
      // Allow domain names, IPv4, and IPv6
      const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
      const ipv6Regex = /^(?:[a-fA-F0-9]{1,4}:){7}[a-fA-F0-9]{1,4}$|^(?:[a-fA-F0-9]{1,4}:){1,7}:|^(?:[a-fA-F0-9]{1,4}:){1,6}:[a-fA-F0-9]{1,4}$|^(?:[a-fA-F0-9]{1,4}:){1,5}(?::[a-fA-F0-9]{1,4}){1,2}$|^(?:[a-fA-F0-9]{1-,4}:){1,4}(?::[a-fA-F0-9]{1,4}){1,3}$|^(?:[a-fA-F0-9]{1,4}:){1,3}(?::[a-fA-F0-9]{1,4}){1,4}$|^(?:[a-fA-F0-9]{1,4}:){1,2}(?::[a-fA-F0-9]{1,4}){1,5}$|^[a-fA-F0-9]{1,4}:(?:(?::[a-fA-F0-9]{1,4}){1,6})$|:((?::[a-fA-F0-9]{1,4}){1,7}|:)$|fe80:(?::[a-fA-F0-9]{0,4}){0,4}%[0-9a-zA-Z]{1,}$|::(ffff(?::0{1,4}){0,1}:){0,1}(?:(25[0-5]|(?:2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(?:2[0-4]|1{0,1}[0-9]){0,1}[0-9])$|^(?:[a-fA-F0-9]{1,4}:){1,4}:(?:(25[0-5]|(?:2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(?:2[0-4]|1{0,1}[0-9]){0,1}[0-9])$/;
      const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,6}$/;
      return ipv4Regex.test(val) || ipv6Regex.test(val) || domainRegex.test(val) || val === 'localhost';
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
