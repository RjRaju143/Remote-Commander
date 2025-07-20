
import { z } from 'zod';
import { ObjectId } from 'mongodb';

export const NotificationTypes = [
    'server_added', 
    'server_shared', 
    'server_favorite', 
    'password_changed', 
    'support_request'
] as const;

export type NotificationType = typeof NotificationTypes[number];


export const NotificationSchema = z.object({
  userId: z.instanceof(ObjectId),
  message: z.string().min(1),
  type: z.enum(NotificationTypes),
  link: z.string().optional(),
  isRead: z.boolean().default(false),
  timestamp: z.date(),
});

export type NotificationModel = z.infer<typeof NotificationSchema>;

export type Notification = NotificationModel & {
    _id: string;
}
