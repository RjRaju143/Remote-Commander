
'use server';

import { z } from "zod";
import bcrypt from "bcryptjs";
import clientPromise from "./mongodb";
import { revalidatePath } from "next/cache";
import { ServerSchema } from "@/models/Server";
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { User } from "@/models/User";
import { ObjectId } from "mongodb";
import type { Server } from "./types";
import { Client } from 'ssh2';
import nodemailer from 'nodemailer';
import { NotificationModel, NotificationSchema, NotificationType } from "@/models/Notification";
import { decrypt, encrypt, getServerById as getServerByIdHelper } from "./server-helpers";
import { getServerMetricsCommand } from "@/ai/flows/get-server-metrics";
import { canUser, isUserAdmin, getUserPermission } from "./auth";
import { getInvitationByToken } from "./invitations";
import { Permission } from "./types";

export interface GenerateCommandState {
  result?: any;
  error?: string;
  input?: string;
}

export interface AuthState {
  error?: string;
  success?: boolean;
  message?: string;
  notification?: boolean;
}

const LoginSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});

const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7; // 7 days

async function createSession(userId: string) {
  try {
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000);

    const client = await clientPromise;
    const db = client.db();
    
    // Ensure TTL index exists for automatic expiration
    const sessionCollection = db.collection('sessions');
    const indexes = await sessionCollection.indexes();
    if (!indexes.some(index => index.key && index.key.expiresAt === 1)) {
      await sessionCollection.createIndex({ "expiresAt": 1 }, { expireAfterSeconds: 0 });
    }

    await sessionCollection.insertOne({
      sessionId,
      userId: new ObjectId(userId),
      expiresAt
    });

    cookies().set('session', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: SESSION_DURATION_SECONDS,
      path: '/',
    });
    
    return { success: true };
  } catch (error) {
    console.error("Session creation failed:", error);
    return { success: false, error: "Could not create a session." };
  }
}


export async function handleLogin(
  prevState: AuthState | undefined,
  formData: FormData
): Promise<AuthState> {
  const validatedFields = LoginSchema.safeParse(
    Object.fromEntries(formData.entries())
  );

  if (!validatedFields.success) {
    return { error: "Invalid fields." };
  }

  const { email, password } = validatedFields.data;

  try {
    const client = await clientPromise;
    const db = client.db();
    const user = await db.collection("users").findOne({ email });

    if (!user) {
      return { error: "Invalid email or password." };
    }

    const passwordsMatch = await bcrypt.compare(password, user.password);

    if (!passwordsMatch) {
      return { error: "Invalid email or password." };
    }

    const sessionResult = await createSession(user._id.toString());
    if (!sessionResult.success) {
      return { error: sessionResult.error };
    }
    
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "Something went wrong." };
  }
}

const RegisterSchema = z.object({
  firstName: z.string().min(1, { message: "First name is required." }),
  lastName: z.string().min(1, { message: "Last name is required." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});


export async function handleRegister(
  prevState: AuthState | undefined,
  formData: FormData
): Promise<AuthState> {
  const validatedFields = RegisterSchema.safeParse(
    Object.fromEntries(formData.entries())
  );

  if (!validatedFields.success) {
    const firstError = validatedFields.error.errors[0]?.message;
    return { error: firstError || "Invalid fields." };
  }

  const { email, password, firstName, lastName } = validatedFields.data;

  try {
    const client = await clientPromise;
    const db = client.db();

    const existingUser = await db.collection("users").findOne({ email });

    if (existingUser) {
      return { error: "An account with this email already exists." };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await db.collection("users").insertOne({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      favorites: [],
      roles: ['user'], // Default role
    });
    
    const sessionResult = await createSession(result.insertedId.toString());
    if (!sessionResult.success) {
      return { error: sessionResult.error };
    }

    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "Something went wrong." };
  }
}

export async function handleLogout() {
  const sessionId = cookies().get('session')?.value;
  if (sessionId) {
    try {
      const client = await clientPromise;
      const db = client.db();
      await db.collection('sessions').deleteOne({ sessionId });
    } catch (error) {
      console.error("Failed to delete session from DB:", error);
    }
  }
  cookies().delete('session');
  redirect('/');
}

export async function getServers({ page = 1, limit = 6, noSort = false }: { page?: number, limit?: number, noSort?: boolean } = {}) {
  const user = await getCurrentUser();
  if (!user) {
    return { servers: [], total: 0 };
  }

  try {
    const client = await clientPromise;
    const db = client.db();
    const userObjectId = new ObjectId(user._id);
    
    const userIsAdmin = isUserAdmin(user);
    
    const matchStage = { 
        $match: userIsAdmin ? {} : { // Admins see all servers
          $or: [
            { ownerId: userObjectId }, 
            { guestIds: userObjectId }
          ] 
        } 
      };

    const serversPipeline: any[] = [
      matchStage,
      {
        $lookup: {
          from: 'users',
          localField: 'ownerId',
          foreignField: '_id',
          as: 'ownerInfo',
        },
      },
      {
        $unwind: { path: "$ownerInfo", preserveNullAndEmptyArrays: true }
      },
      {
        $addFields: {
          isFavorite: { $in: ["$_id", user.favorites?.map(fav => new ObjectId(fav)) || []] }
        }
      },
      
    ];

    if (!noSort) {
      serversPipeline.push({ $sort: { isFavorite: -1, name: 1 } });
    } else {
      serversPipeline.push({ $sort: { name: 1 } });
    }
    
    const skip = (page - 1) * limit;

    serversPipeline.push({ $skip: skip });
    serversPipeline.push({ $limit: limit });
    serversPipeline.push({
      $project: {
        name: 1,
        ip: 1,
        port: 1,
        username: 1,
        status: 1,
        ownerId: 1,
        guestIds: 1,
        owner: {
          _id: '$ownerInfo._id',
          email: '$ownerInfo.email'
        }
      }
    });


    const servers = await db.collection("servers").aggregate(serversPipeline).toArray();
    
    const totalServersResult = await db.collection("servers").aggregate([
        matchStage,
        { $count: "total" }
    ]).toArray();
    const total = totalServersResult.length > 0 ? totalServersResult[0].total : 0;

    const plainServers = JSON.parse(JSON.stringify(servers));
    
    return {
      servers: plainServers.map((s: any) => ({ ...s, id: s._id.toString() })),
      total
    };

  } catch (error) {
    console.error("Failed to fetch servers:", error);
    return { servers: [], total: 0 };
  }
}

export async function getFavoriteServers({ page = 1, limit = 6 }: { page?: number, limit?: number } = {}) {
  const user = await getCurrentUser();
  if (!user || !user.favorites || user.favorites.length === 0) {
    return { servers: [], total: 0 };
  }

  try {
    const client = await clientPromise;
    const db = client.db();
    const favoriteIds = user.favorites.map(id => new ObjectId(id));
    
    const userIsAdmin = isUserAdmin(user);

    const matchStage = {
      $match: {
        _id: { $in: favoriteIds },
        ...(userIsAdmin ? {} : { // Admin can see any favorite, others must have permission
             $or: [
              { ownerId: new ObjectId(user._id) },
              { guestIds: new ObjectId(user._id) }
            ]
        })
      }
    };
    
    const serversPipeline = [
      matchStage,
      { $sort: { name: 1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: 'ownerId',
          foreignField: '_id',
          as: 'ownerInfo',
        },
      },
      {
        $unwind: { path: "$ownerInfo", preserveNullAndEmptyArrays: true }
      },
      {
        $project: {
          name: 1,
          ip: 1,
          port: 1,
          username: 1,
          status: 1,
          ownerId: 1,
          guestIds: 1,
          owner: {
            _id: '$ownerInfo._id',
            email: '$ownerInfo.email'
          }
        }
      }
    ];

    const servers = await db.collection("servers").aggregate(serversPipeline).toArray();
    
    const totalResult = await db.collection("servers").aggregate([
      matchStage,
      { $count: 'total' }
    ]).toArray();
    const total = totalResult.length > 0 ? totalResult[0].total : 0;
    
    const plainServers = JSON.parse(JSON.stringify(servers));
    return {
      servers: plainServers.map((s: any) => ({ ...s, id: s._id.toString() })),
      total
    };

  } catch (error) {
    console.error("Failed to fetch favorite servers:", error);
    return { servers: [], total: 0 };
  }
}


export async function getServerById(serverId: string): Promise<Server | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const server = await getServerByIdHelper(serverId, user._id);

  if (!server) return null;

  // Enrich with current user's permission
  server.userPermission = await getUserPermission(server, user);

  return server;
}


const AddServerSchema = ServerSchema.omit({ ownerId: true, guestIds: true });

export async function addServer(
  prevState: AuthState | undefined,
  formData: FormData
): Promise<AuthState> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "You must be logged in to add a server." };
  }
  
  const validatedServer = AddServerSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!validatedServer.success) {
    const firstError = validatedServer.error.errors[0]?.message;
    return { error: firstError || "Invalid server data." };
  }

  try {
    const client = await clientPromise;
    const db = client.db();

    const { privateKey, ...serverDetails } = validatedServer.data;

    const serverToInsert: Record<string, any> = {
      ...serverDetails,
      ownerId: new ObjectId(user._id),
      guestIds: [],
      status: 'inactive'
    };

    if (privateKey) {
      serverToInsert.privateKey = encrypt(privateKey);
    }

    const inserted = await db.collection("servers").insertOne(serverToInsert);

    await createNotification(user._id, `You added a new server: "${serverDetails.name}".`, 'server_added', `/dashboard/server/${inserted.insertedId.toString()}`);

    revalidatePath("/dashboard");
    return { success: true, notification: true };
  } catch (error) {
    console.error("Failed to add server:", error);
    if (error instanceof Error && error.message.includes('ENCRYPTION_SECRET')) {
      return { error: 'Server configuration error: Encryption secret is missing.' };
    }
    return { error: "Could not save server to the database." };
  }
}

const UpdateServerSchema = ServerSchema.partial().extend({
    serverId: z.string().refine((id) => ObjectId.isValid(id)),
});

export async function updateServer(
    prevState: AuthState | undefined,
    formData: FormData
): Promise<AuthState> {
  const user = await getCurrentUser();
  if (!user) return { error: "You must be logged in." };
  
  const validatedFields = UpdateServerSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validatedFields.success) {
    return { error: "Invalid server data." };
  }
  
  const { serverId, ...serverData } = validatedFields.data;

  const server = await getServerById(serverId);
  if (!server) return { error: "Server not found." };
  
  const hasPermission = await canUser(server, Permission.ADMIN, user);
  if (!hasPermission) {
    return { error: "You do not have permission to update this server." };
  }

  try {
    const client = await clientPromise;
    const db = client.db();
    
    const { privateKey, ...serverDetails } = serverData;
    
    const updateDoc: Record<string, any> = { ...serverDetails };

    if (privateKey) {
        updateDoc.privateKey = encrypt(privateKey);
    }

    const result = await db.collection("servers").updateOne(
      { _id: new ObjectId(serverId) },
      { $set: updateDoc }
    );
    
    if (result.matchedCount === 0) {
      return { error: "Server not found." };
    }
    
    const serverName = serverData.name || 'the server';
    await createNotification(user._id, `You updated the server: "${serverName}".`, 'server_added');


    revalidatePath("/dashboard");
    revalidatePath(`/dashboard/server/${serverId}`);
    return { success: true, notification: true };
  } catch (error) {
    console.error("Failed to update server:", error);
    return { error: "Could not update server in the database." };
  }
}

export async function deleteServer(serverId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "You must be logged in." };

  if (!ObjectId.isValid(serverId)) return { error: "Invalid server ID." };

  try {
    const client = await clientPromise;
    const db = client.db();
    
    const serverToDelete = await getServerById(serverId);
    if (!serverToDelete) {
      return { error: "Server not found." };
    }
    
    const hasPermission = await canUser(serverToDelete, Permission.ADMIN, user);
    if (!hasPermission) {
      return { error: "You do not have permission to delete this server." };
    }

    // Also delete all invitations associated with this server
    await db.collection("invitations").deleteMany({ serverId: new ObjectId(serverToDelete.id) });
    const result = await db.collection("servers").deleteOne({ _id: new ObjectId(serverToDelete.id) });

    if (result.deletedCount === 0) {
      return { error: "Failed to delete the server after finding it." };
    }

    await createNotification(user._id, `You deleted the server: "${serverToDelete.name}".`, 'server_added');

    revalidatePath("/dashboard");
    return { success: true, notification: true };
  } catch (error) {
    console.error("Failed to delete server:", error);
    return { error: "Could not delete server from the database." };
  }
}


export async function testServerConnection(serverId: string): Promise<{ success: boolean; error?: string }> {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Authentication failed. Please log in again.' };

    const server = await getServerById(serverId);
    if (!server) return { success: false, error: 'Server not found or you do not have permission.' };
    
    const hasPermission = await canUser(server, Permission.EXECUTE, user);
    if (!hasPermission) {
        return { success: false, error: 'You do not have permission to connect to this server.' };
    }

    let privateKey: any;
    if (server.privateKey) {
        try {
            privateKey = decrypt(server.privateKey);
        } catch (e) {
            return { success: false, error: 'Failed to decrypt private key. It may be corrupted.' };
        }
    }

    return new Promise((resolve) => {
        const conn = new Client();
        conn.on('ready', () => {
            conn.end();
            resolve({ success: true });
        }).on('error', (err: Error) => {
            let errorMessage = 'An unknown connection error occurred.';
            if (err.message.includes('ECONNREFUSED')) {
                errorMessage = 'Connection refused by server.';
            } else if (err.message.includes('ENOTFOUND')) {
                errorMessage = 'Server IP address not found.';
            } else if (err.message.toLowerCase().includes('authentication')) {
                errorMessage = 'Authentication failed. Check username and private key.';
            } else if (err.message.includes('Timed out')) {
                errorMessage = 'Connection timed out. Server may be offline or firewall is blocking the connection.';
            }
            resolve({ success: false, error: errorMessage });
        }).connect({
            host: server.ip,
            port: Number(server.port),
            username: server.username,
            privateKey: privateKey,
            readyTimeout: 10000,
        });
    });
}

export async function getServerPrivateKey(serverId: string): Promise<{error?: string; privateKey?: string}> {
  const user = await getCurrentUser();
  if (!user) return { error: "You must be logged in." };
  
  if (!ObjectId.isValid(serverId)) return { error: "Invalid server ID." };

  const server = await getServerById(serverId);
  if (!server) return { error: "Server not found or you do not have permission to download the key." };

  const hasPermission = await canUser(server, Permission.ADMIN, user);
  if (!hasPermission) {
    return { error: "You do not have permission to download this key." };
  }

  if (!server.privateKey) {
    return { error: "No private key is associated with this server." };
  }

  try {
    const decryptedKey = decrypt(server.privateKey);
    return { privateKey: decryptedKey };

  } catch (error) {
    console.error('Failed to fetch private key:', error);
    return { error: 'An unexpected error occurred while retrieving the key.' };
  }
}

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required.'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters.'),
  confirmPassword: z.string()
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "New passwords do not match.",
  path: ["confirmPassword"],
});

export async function handleChangePassword(
    prevState: AuthState | undefined,
    formData: FormData
): Promise<AuthState> {
    const user = await getCurrentUser();
    if (!user) {
        return { error: 'You must be logged in.' };
    }

    const validatedFields = ChangePasswordSchema.safeParse(Object.fromEntries(formData.entries()));

    if (!validatedFields.success) {
        return { error: validatedFields.error.errors[0]?.message || 'Invalid data.' };
    }

    const { currentPassword, newPassword } = validatedFields.data;

    try {
        const client = await clientPromise;
        const db = client.db();

        const fullUser = await db.collection('users').findOne({ _id: new ObjectId(user._id) });
        if (!fullUser || !fullUser.password) {
            return { error: 'Could not find user data.' };
        }

        const passwordsMatch = await bcrypt.compare(currentPassword, fullUser.password);
        if (!passwordsMatch) {
            return { error: 'The current password you entered is incorrect.' };
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        await db.collection('users').updateOne(
            { _id: new ObjectId(user._id) },
            { $set: { password: hashedNewPassword } }
        );
        
        await createNotification(user._id, "Your password was changed successfully.", 'password_changed');

        return { success: true, notification: true };

    } catch (error) {
        console.error('Failed to change password:', error);
        return { error: 'An unexpected error occurred.' };
    }
}

const ProfileSchema = z.object({
  firstName: z.string().min(1, { message: "First name is required." }),
  lastName: z.string().min(1, { message: "Last name is required." }),
});

export async function handleUpdateProfile(
  prevState: AuthState | undefined,
  formData: FormData
): Promise<AuthState> {
    const user = await getCurrentUser();
    if (!user) {
        return { error: "You must be logged in." };
    }

    const validatedFields = ProfileSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!validatedFields.success) {
        return { error: validatedFields.error.errors[0]?.message || 'Invalid data.' };
    }

    const { firstName, lastName } = validatedFields.data;

    try {
        const client = await clientPromise;
        const db = client.db();

        await db.collection("users").updateOne(
            { _id: new ObjectId(user._id) },
            { $set: { firstName, lastName } }
        );
        
        revalidatePath('/dashboard/settings');
        revalidatePath('/dashboard'); // To update sidebar
        return { success: true };
    } catch (error) {
        console.error('Failed to update profile:', error);
        return { error: 'An unexpected error occurred.' };
    }
}

export async function getUserForProfile(): Promise<User | null> {
    const user = await getCurrentUser();
    if (!user) {
        return null;
    }
    // Only return fields safe for the client
    return {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
    };
}

// Notification Actions

export async function createNotification(
    userId: string,
    message: string,
    type: NotificationType,
    link?: string
) {
    try {
        const client = await clientPromise;
        const db = client.db();

        const notification: NotificationModel = {
            userId: new ObjectId(userId),
            message,
            type,
            link: link || '#',
            isRead: false,
            timestamp: new Date(),
        };

        const validatedNotification = NotificationSchema.safeParse(notification);
        if (!validatedNotification.success) {
            console.error("Invalid notification data:", validatedNotification.error);
            return;
        }

        await db.collection('notifications').insertOne(validatedNotification.data);
    } catch (error) {
        console.error("Failed to create notification:", error);
    }
}

export async function getNotifications(): Promise<{ notifications: Notification[], unreadCount: number }> {
    const user = await getCurrentUser();
    if (!user) {
        return { notifications: [], unreadCount: 0 };
    }

    try {
        const client = await clientPromise;
        const db = client.db();
        const userId = new ObjectId(user._id);

        const notifications = await db.collection('notifications')
            .find({ userId })
            .sort({ timestamp: -1 })
            .limit(20) // Get last 20 notifications
            .toArray();
        
        const unreadCount = await db.collection('notifications').countDocuments({ userId, isRead: false });

        const plainNotifications = JSON.parse(JSON.stringify(notifications));

        return { notifications: plainNotifications.map((n: any) => ({...n, _id: n._id.toString()})), unreadCount };

    } catch (error) {
        console.error("Failed to get notifications:", error);
        return { notifications: [], unreadCount: 0 };
    }
}

export async function markNotificationAsRead(notificationId: string) {
    const user = await getCurrentUser();
    if (!user) return { error: "Unauthorized" };

    if (!ObjectId.isValid(notificationId)) return { error: "Invalid ID" };

    try {
        const client = await clientPromise;
        const db = client.db();
        await db.collection('notifications').updateOne(
            { _id: new ObjectId(notificationId), userId: new ObjectId(user._id) },
            { $set: { isRead: true } }
        );
        return { success: true };
    } catch (error) {
        console.error("Failed to mark notification as read:", error);
        return { error: "Database error" };
    }
}

export async function markAllNotificationsAsRead() {
    const user = await getCurrentUser();
    if (!user) return { error: "Unauthorized" };

    try {
        const client = await clientPromise;
        const db = client.db();
        await db.collection('notifications').updateMany(
            { userId: new ObjectId(user._id), isRead: false },
            { $set: { isRead: true } }
        );
        return { success: true };
    } catch (error) {
        console.error("Failed to mark all notifications as read:", error);
        return { error: "Database error" };
    }
}
    
export async function deleteAllNotifications() {
    const user = await getCurrentUser();
    if (!user) return { error: "Unauthorized" };

    try {
        const client = await clientPromise;
        const db = client.db();
        await db.collection('notifications').deleteMany({ userId: new ObjectId(user._id) });
        return { success: true };
    } catch (error) {
        console.error("Failed to delete all notifications:", error);
        return { error: "Database error" };
    }
}


export async function getServerMetrics(serverId: string) {
    const user = await getCurrentUser();
    if (!user) return { error: 'Authentication failed. Please log in again.' };

    const server = await getServerById(serverId);
    if (!server) return { error: 'Server not found or you do not have permission.' };
    
    const hasPermission = await canUser(server, Permission.EXECUTE, user);
    if (!hasPermission) {
        return { error: 'You do not have permission to execute commands on this server.' };
    }

    try {
        const { command } = await getServerMetricsCommand();

        return new Promise((resolve) => {
            const conn = new Client();
            let output = '';

            conn.on('ready', () => {
                conn.exec(command, (err, stream) => {
                    if (err) {
                        conn.end();
                        return resolve({ error: `Execution error: ${err.message}` });
                    }
                    stream.on('data', (data: Buffer) => {
                        output += data.toString();
                    }).on('close', () => {
                        conn.end();
                        const [cpu, memory, disk] = output.trim().split(' ').map(parseFloat);
                        if (!isNaN(cpu) && !isNaN(memory) && !isNaN(disk)) {
                            resolve({ success: true, metrics: { cpu, memory, disk } });
                        } else {
                            resolve({ error: 'Failed to parse metrics from server output.' });
                        }
                    });
                });
            }).on('error', (err: Error) => {
                resolve({ error: `Connection error: ${err.message}` });
            }).connect({
                host: server.ip,
                port: Number(server.port),
                username: server.username,
                privateKey: decrypt(server.privateKey || ''),
                readyTimeout: 10000,
            });
        });
    } catch (error: any) {
        return { error: `Failed to get metrics command: ${error.message}` };
    }
}


const SmtpSettingsSchema = z.object({
  host: z.string().min(1, 'Host is required'),
  port: z.coerce.number().min(1, 'Port is required'),
  user: z.string().min(1, 'User is required'),
  pass: z.string().min(1, 'Password is required'),
  senderEmail: z.string().email('Invalid sender email'),
});

export async function saveSmtpSettings(
    prevState: AuthState | undefined,
    formData: FormData
): Promise<AuthState> {
    const user = await getCurrentUser();
    if (!user || !isUserAdmin(user)) {
        return { error: "You do not have permission to modify SMTP settings." };
    }

    const validatedFields = SmtpSettingsSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!validatedFields.success) {
        return { error: validatedFields.error.errors[0].message };
    }

    const { pass, ...settings } = validatedFields.data;
    const encryptedPass = encrypt(pass);

    try {
        const client = await clientPromise;
        const db = client.db();
        await db.collection('settings').updateOne(
            { key: 'smtp' },
            { $set: { key: 'smtp', ...settings, pass: encryptedPass } },
            { upsert: true }
        );
        revalidatePath('/dashboard/settings');
        return { success: true, message: "SMTP settings saved successfully." };
    } catch (error) {
        console.error("Failed to save SMTP settings:", error);
        return { error: "Could not save settings to database." };
    }
}

export async function getSmtpSettings() {
    const user = await getCurrentUser();
    if (!user || !isUserAdmin(user)) return null;

    try {
        const client = await clientPromise;
        const db = client.db();
        const settings = await db.collection('settings').findOne({ key: 'smtp' });
        if (!settings) return null;
        
        const { pass, ...rest } = settings; // Don't send password to client
        return JSON.parse(JSON.stringify(rest));
    } catch (error) {
        console.error("Failed to get SMTP settings:", error);
        return null;
    }
}

export async function deleteSmtpSettings() {
    const user = await getCurrentUser();
    if (!user || !isUserAdmin(user)) {
        return { error: "You do not have permission to delete SMTP settings." };
    }

    try {
        const client = await clientPromise;
        const db = client.db();
        await db.collection('settings').deleteOne({ key: 'smtp' });
        revalidatePath('/dashboard/settings');
        return { success: true };
    } catch (error) {
        console.error("Failed to delete SMTP settings:", error);
        return { error: "Database error." };
    }
}

export async function testSmtpConnection(
    prevState: AuthState | undefined,
    formData: FormData
): Promise<AuthState> {
    const user = await getCurrentUser();
    if (!user || !isUserAdmin(user)) {
        return { error: "Unauthorized" };
    }

    const validatedFields = SmtpSettingsSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!validatedFields.success) {
        return { error: "Invalid data." };
    }

    const settings = validatedFields.data;

    const transporter = nodemailer.createTransport({
        host: settings.host,
        port: settings.port,
        secure: settings.port === 465,
        auth: {
            user: settings.user,
            pass: settings.pass,
        },
    });

    try {
        await transporter.verify();
        return { success: true, message: "Connection successful!" };
    } catch (error: any) {
        return { error: `Connection failed: ${error.message}` };
    }
}

export async function handleInvitation(token: string, action: 'accept' | 'decline') {
    const user = await getCurrentUser();
    if (!user) return { error: "You must be logged in to respond to an invitation." };

    const db = (await clientPromise).db();
    const invitation = await db.collection('invitations').findOne({ token, status: 'pending', expiresAt: { $gt: new Date() } });

    if (!invitation) return { error: "This invitation is invalid or has expired." };
    if (invitation.email !== user.email) return { error: "This invitation is for a different user." };
    if (invitation.ownerId.toString() === user._id) return { error: "You cannot accept an invitation you sent." };

    if (action === 'decline') {
        await db.collection('invitations').updateOne({ _id: invitation._id }, { $set: { status: 'declined', recipientId: new ObjectId(user._id) } });
        return { success: true, message: "You have declined the invitation." };
    }

    // Accept
    const result = await db.collection('invitations').findOneAndUpdate(
        { _id: invitation._id },
        { $set: { status: 'accepted', recipientId: new ObjectId(user._id) } },
        { returnDocument: 'after' }
    );
    
    // Add user to the server's guestIds array
    await db.collection('servers').updateOne(
        { _id: invitation.serverId },
        { $addToSet: { guestIds: new ObjectId(user._id) } }
    );
    
    if (result) {
        await createNotification(invitation.ownerId.toString(), `${user.email} has accepted your invitation to access a server.`, 'server_shared');
        revalidatePath('/dashboard/guests');
        revalidatePath('/dashboard');
        return { success: true, serverId: invitation.serverId.toString() };
    } else {
        return { error: 'Failed to accept invitation.' };
    }
}


/**
 * Gets the currently logged-in user from the session cookie.
 */
export async function getCurrentUser(): Promise<User | null> {
    const sessionId = cookies().get('session')?.value;
    if (!sessionId) return null;

    try {
        const client = await clientPromise;
        const db = client.db();
        
        // Find session and check if it's expired
        const session = await db.collection('sessions').findOne({ 
            sessionId: sessionId,
            expiresAt: { $gt: new Date() }
        });

        if (!session) {
            // Clean up expired cookie
            cookies().delete('session');
            return null;
        }

        const user = await db.collection('users').findOne(
            { _id: session.userId },
        );
        if (!user) {
            return null;
        }
        
        const plainUser = JSON.parse(JSON.stringify(user));
        plainUser._id = plainUser._id.toString();
        // Ensure favorites is an array even if it's missing
        plainUser.favorites = plainUser.favorites?.map((id: ObjectId | string) => id.toString()) || [];
        plainUser.roles = plainUser.roles || ['user'];

        return plainUser;
    } catch (error) {
        console.error('Failed to fetch user:', error);
        return null;
    }
}


export async function leaveSharedServer(serverId: string) {
    const guestUser = await getCurrentUser();
    if (!guestUser) {
        return { error: "You must be logged in." };
    }

    if (!ObjectId.isValid(serverId)) {
        return { error: "Invalid server ID." };
    }

    try {
        const client = await clientPromise;
        const db = client.db();
        const serverObjectId = new ObjectId(serverId);
        const guestUserObjectId = new ObjectId(guestUser._id);
        
        const server = await db.collection('servers').findOne({ _id: serverObjectId });
        if (!server) {
            return { error: "The associated server could not be found." };
        }
        
        // Remove guest from server's guestIds array
        const updateResult = await db.collection('servers').updateOne(
            { _id: serverObjectId },
            { $pull: { guestIds: guestUserObjectId } }
        );

        if (updateResult.modifiedCount === 0) {
            return { error: "Failed to remove your access. You might not have been a guest on this server." };
        }
        
        // Also update any related invitations to 'revoked' status for clarity
        await db.collection('invitations').updateMany(
            { serverId: serverObjectId, recipientId: guestUserObjectId },
            { $set: { status: 'revoked' } }
        );

        // Notify the owner
        await createNotification(
            server.ownerId.toString(),
            `Guest ${guestUser.email} has removed their own access from your server: "${server.name}".`,
            'server_shared'
        );

        revalidatePath('/dashboard');
        return { success: true, notification: true };
    } catch (error) {
        console.error("Failed to leave server:", error);
        return { error: "An unexpected error occurred." };
    }
}

export async function toggleFavoriteServer(serverId: string) {
    const user = await getCurrentUser();
    if (!user) {
        return { error: 'You must be logged in.' };
    }
    if (!ObjectId.isValid(serverId)) {
        return { error: 'Invalid server ID.' };
    }

    try {
        const client = await clientPromise;
        const db = client.db();
        const userObjectId = new ObjectId(user._id);
        const serverObjectId = new ObjectId(serverId);

        const server = await db.collection('servers').findOne({ _id: serverObjectId });
        if (!server) {
            return { error: 'Server not found.' };
        }

        const isFavorite = user.favorites?.some(id => new ObjectId(id).equals(serverObjectId));
        
        let updateOperation;
        if (isFavorite) {
            // Remove from favorites
            updateOperation = { $pull: { favorites: serverObjectId } };
        } else {
            // Add to favorites
            updateOperation = { $addToSet: { favorites: serverObjectId } };
        }

        await db.collection('users').updateOne({ _id: userObjectId }, updateOperation);

        let notification = false;
        if (!isFavorite) {
            await createNotification(user._id, `You marked "${server.name}" as a favorite.`, 'server_favorite');
            notification = true;
        }

        // Don't revalidate here to prevent re-sorting
        revalidatePath('/dashboard/favorites');
        // revalidatePath('/dashboard');
        return { success: true, notification };
    } catch (error) {
        console.error('Failed to toggle favorite:', error);
        return { error: 'An unexpected error occurred.' };
    }
}

const SupportRequestSchema = z.object({
  message: z.string().min(10, 'Message must be at least 10 characters.'),
});

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function handleSupportRequest(
    prevState: AuthState | undefined,
    formData: FormData
): Promise<AuthState> {
    const user = await getCurrentUser();
    if (!user || !user.firstName || !user.email) {
      return { error: 'You must be logged in to send a support request.' };
    }

    const validatedFields = SupportRequestSchema.safeParse(Object.fromEntries(formData.entries()));

    if (!validatedFields.success) {
        return { error: validatedFields.error.errors[0]?.message || 'Invalid data.' };
    }

    const { message } = validatedFields.data;
    const name = `${user.firstName} ${user.lastName || ''}`.trim();
    const email = user.email;
    
    // Fetch SMTP settings from DB first
    const dbClient = await clientPromise;
    const db = dbClient.db();
    const smtpSettings = await db.collection('settings').findOne({ key: 'smtp' });

    let transporter;

    if (smtpSettings) {
        transporter = nodemailer.createTransport({
            host: smtpSettings.host,
            port: Number(smtpSettings.port),
            secure: Number(smtpSettings.port) === 465,
            auth: {
                user: smtpSettings.user,
                pass: decrypt(smtpSettings.pass),
            },
        });
    } else {
        // Fallback to environment variables
        const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

        if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
            console.error("SMTP environment variables are not set and no DB config found.");
            return { error: "The application is not configured to send emails. Please contact an administrator." };
        }
        transporter = nodemailer.createTransport({
            host: SMTP_HOST,
            port: Number(SMTP_PORT),
            secure: Number(SMTP_PORT) === 465,
            auth: { user: SMTP_USER, pass: SMTP_PASS },
        });
    }
    
    const recipientEmail = smtpSettings?.senderEmail || process.env.SENDER_EMAIL;
    if (!recipientEmail) {
        console.error("Recipient email (SENDER_EMAIL) is not configured in DB or .env.");
        return { error: "The application's recipient email is not configured." };
    }
    
    const senderUser = smtpSettings?.user || process.env.SMTP_USER;


    try {
        await transporter.verify();
    } catch (error) {
        console.error("SMTP connection error:", error);
        return { error: "Could not connect to the email server. Please try again later." };
    }

    const sanitizedMessage = escapeHtml(message);
    
    const emailPlainText = `
New Support Request from Remote Commander
=========================================

You've received a new support request with the following details:

Name: ${name}
Email: ${email}

Message:
${message}

-----------------------------------------
This email was automatically generated by the Remote Commander application.
`;

    const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Support Request</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'; margin: 0; padding: 0; background-color: #f4f4f7; }
        .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border: 1px solid #e2e2e7; border-radius: 8px; overflow: hidden; }
        .header { background-color: hsl(182, 100%, 75%); color: hsl(240, 6%, 10%); padding: 24px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 24px; color: #333333; }
        .content h2 { color: hsl(182, 100%, 75%); font-size: 18px; margin-top: 0; }
        .info-box { background-color: #f8f8fa; border: 1px solid #e2e2e7; border-radius: 4px; padding: 16px; margin-bottom: 24px; }
        .info-box p { margin: 0 0 8px; }
        .info-box strong { color: #555555; }
        .message-box { white-space: pre-wrap; word-wrap: break-word; background-color: #f8f8fa; border: 1px solid #e2e2e7; padding: 16px; border-radius: 4px; font-family: 'Source Code Pro', 'Courier New', Courier, monospace; }
        .footer { background-color: #f4f4f7; color: #888888; text-align: center; font-size: 12px; padding: 16px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header"><h1>New Support Request</h1></div>
        <div class="content">
            <h2>You've received a new message via the Remote Commander support form.</h2>
            <div class="info-box">
                <p><strong>From:</strong> ${escapeHtml(name)}</p>
                <p><strong>Reply-To Email:</strong> <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>
            </div>
            <h2>Message:</h2>
            <div class="message-box">${sanitizedMessage.replace(/\n/g, '<br>')}</div>
        </div>
        <div class="footer">This is an automated message from the Remote Commander application.</div>
    </div>
</body>
</html>
`;

    try {
        await transporter.sendMail({
            from: `"Remote Commander Support" <${senderUser}>`,
            replyTo: `"${name}" <${email}>`,
            to: recipientEmail,
            subject: `New Support Request from ${name}`,
            text: emailPlainText,
            html: emailHtml,
        });

        if (user) {
          await createNotification(user._id, "Your support request has been sent.", 'support_request');
        }

        return { success: true, notification: !!user };
    } catch (error) {
        console.error("Failed to send support email:", error);
        return { error: "There was an issue sending your message. Please try again." };
    }
}
    
