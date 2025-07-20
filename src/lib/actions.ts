

'use server';

import { generateCommand } from "@/ai/flows/generate-command";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import clientPromise from "./mongodb";
import { revalidatePath } from "next/cache";
import { ServerSchema } from "@/models/Server";
import CryptoJS from "crypto-js";
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { jwtVerify } from "jose";
import type { User } from "@/models/User";
import { ObjectId } from "mongodb";
import type { Server } from "./types";
import { Client } from 'ssh2';
import nodemailer from 'nodemailer';
import { NotificationModel, NotificationSchema, NotificationType } from "@/models/Notification";


export interface GenerateCommandState {
  result?: {
    command: string;
    description: string;
  };
  error?: string;
  input?: string;
}

const RequestSchema = z.string().min(1, { message: "Request is required." });

export async function handleGenerateCommand(
  prevState: GenerateCommandState,
  formData: FormData
): Promise<GenerateCommandState> {
  const request = formData.get("request");
  const validatedRequest = RequestSchema.safeParse(request);

  if (!validatedRequest.success) {
    return { error: "Please enter a valid request." };
  }

  const input = validatedRequest.data;

  try {
    const result = await generateCommand({ request: input });
    return { result, input };
  } catch (error) {
    console.error("Generation failed:", error);
    return { error: "AI generation failed. Please try again.", input };
  }
}

export interface ExecuteCommandState {
  result?: string;
  error?: string;
}

export async function handleExecuteCommand(
  serverId: string,
  prevState: ExecuteCommandState,
  formData: FormData
): Promise<ExecuteCommandState> {
  const command = formData.get("command") as string;

  if (!command) {
    return { error: 'Command is required.' };
  }
  
  const creds = await getServerById(serverId);
  if (!creds) {
    return { error: 'Server not found or you do not have permission to access it.' };
  }
  if (creds.privateKey) {
    creds.privateKey = decrypt(creds.privateKey);
  }

  return new Promise((resolve) => {
    const conn = new Client();
    let output = '';

    conn.on('ready', () => {
      conn.exec(command, (err: Error, stream: any) => {
        if (err) {
          conn.end();
          return resolve({ error: `Execution failed: ${err.message}` });
        }
        stream.on('close', () => {
          conn.end();
          resolve({ result: output });
        }).on('data', (data: Buffer) => {
          output += data.toString('utf8');
        }).stderr.on('data', (data: Buffer) => {
          output += data.toString('utf8');
        });
      });
    }).on('error', (err: Error) => {
      resolve({ error: `Connection failed: ${err.message}` });
    }).connect({
      host: creds.ip,
      port: Number(creds.port),
      username: creds.username,
      privateKey: creds.privateKey,
      readyTimeout: 10000,
    });
  });
}


export interface AuthState {
  error?: string;
  success?: boolean;
}

const LoginSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is not set.");
}
const secret = new TextEncoder().encode(JWT_SECRET);

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

    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const cookieStore = await cookies();
    cookieStore.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

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
    });

    const token = jwt.sign(
      { userId: result.insertedId.toString(), email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const cookieStore = await cookies()
    cookieStore.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });


    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "Something went wrong." };
  }
}

export async function handleLogout() {
  const cookieStore = await cookies()
  cookieStore.delete('session');
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

    const skip = (page - 1) * limit;

    const matchStage = { 
        $match: { 
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
    const userObjectId = new ObjectId(user._id);
    const favoriteIds = user.favorites.map(id => new ObjectId(id));

    const skip = (page - 1) * limit;

    const matchStage = {
      $match: {
        _id: { $in: favoriteIds },
        $or: [
          { ownerId: userObjectId },
          { guestIds: userObjectId }
        ]
      }
    };
    
    const serversPipeline = [
      matchStage,
      { $sort: { name: 1 } },
      { $skip: skip },
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

  if (!ObjectId.isValid(serverId)) return null;
  const serverObjectId = new ObjectId(serverId);
  const userObjectId = new ObjectId(user._id);

  try {
    const client = await clientPromise;
    const db = client.db();

    // Find the server and check if the current user is either the owner or in the guestIds array
    const server = await db.collection('servers').findOne({ 
        _id: serverObjectId,
        $or: [
          { ownerId: userObjectId },
          { guestIds: userObjectId }
        ]
    });
    if (!server) return null;

    const serverDoc = server as any;
    const serverData = JSON.parse(JSON.stringify(serverDoc));
    return { ...serverData, id: serverData._id.toString() };

  } catch (error) {
    console.error("Failed to fetch server:", error);
    return null;
  }
}


// Encryption/Decryption functions
function encrypt(text: string): string {
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret) {
    throw new Error('ENCRYPTION_SECRET is not set in the environment variables.');
  }
  return CryptoJS.AES.encrypt(text, secret).toString();
}

function decrypt(ciphertext: string): string {
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret) {
    throw new Error('ENCRYPTION_SECRET is not set in the environment variables.');
  }
  const bytes = CryptoJS.AES.decrypt(ciphertext, secret);
  return bytes.toString(CryptoJS.enc.Utf8);
}


export async function addServer(serverData: unknown) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "You must be logged in to add a server." };
  }

  const validatedServer = ServerSchema.safeParse(serverData);
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


async function verifyJwt(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (error) {
    return null;
  }
}

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies()
    const token = cookieStore.get('session')?.value;
    if (!token) return null;

    const decoded = await verifyJwt(token);
    if (!decoded || !decoded.userId) return null;
    
    try {
        const client = await clientPromise;
        const db = client.db();
        const user = await db.collection('users').findOne(
            { _id: new ObjectId(decoded.userId as string) },
        );
        if (!user) {
            return null;
        }
        
        const plainUser = JSON.parse(JSON.stringify(user));
        plainUser._id = plainUser._id.toString();
        // Ensure favorites is an array even if it's missing
        plainUser.favorites = plainUser.favorites?.map((id: ObjectId | string) => id.toString()) || [];

        return plainUser;
    } catch (error) {
        console.error('Failed to fetch user:', error);
        return null;
    }
}

export async function updateServer(serverId: string, serverData: unknown) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "You must be logged in." };
  }
  
  if (!ObjectId.isValid(serverId)) {
    return { error: "Invalid server ID." };
  }

  const validatedServer = ServerSchema.partial().safeParse(serverData);
  if (!validatedServer.success) {
    return { error: "Invalid server data." };
  }

  try {
    const client = await clientPromise;
    const db = client.db();
    
    const { privateKey, ...serverDetails } = validatedServer.data;
    
    const updateDoc: Record<string, any> = { ...serverDetails };

    if (privateKey) {
        updateDoc.privateKey = encrypt(privateKey);
    }

    const result = await db.collection("servers").updateOne(
      { _id: new ObjectId(serverId), ownerId: new ObjectId(user._id) },
      { $set: updateDoc }
    );
    
    if (result.matchedCount === 0) {
      return { error: "Server not found or you do not have permission to update it." };
    }
    
    const serverName = validatedServer.data.name || 'the server';
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
  if (!user) {
    return { error: "You must be logged in." };
  }

  if (!ObjectId.isValid(serverId)) {
    return { error: "Invalid server ID." };
  }

  try {
    const client = await clientPromise;
    const db = client.db();
    
    // Find server first to get name for notification
    const serverToDelete = await db.collection("servers").findOne({ 
      _id: new ObjectId(serverId),
      ownerId: new ObjectId(user._id),
    });

    if (!serverToDelete) {
      return { error: "Server not found or you do not have permission to delete it." };
    }
    
    const result = await db.collection("servers").deleteOne({ _id: serverToDelete._id });

    if (result.deletedCount === 0) {
      // This case should be rare given the findOne check, but it's good practice
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
  const creds = await getServerById(serverId);
  if (!creds) {
    return { success: false, error: 'Server not found or you do not have permission.' };
  }
  if (creds.privateKey) {
    creds.privateKey = decrypt(creds.privateKey);
  }

  return new Promise((resolve) => {
    const conn = new Client();
    conn
      .on('ready', () => {
        conn.end();
        resolve({ success: true });
      })
      .on('error', (err: Error) => {
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
      })
      .connect({
        host: creds.ip,
        port: Number(creds.port),
        username: creds.username,
        privateKey: creds.privateKey,
        readyTimeout: 10000,
      });
  });
}

// Sharing Actions

export async function shareServer(serverId: string, emailToShareWith: string) {
  const owner = await getCurrentUser();
  if (!owner) {
    return { error: "You must be logged in." };
  }

  if (!ObjectId.isValid(serverId)) {
    return { error: "Invalid server ID." };
  }
   if (!z.string().email().safeParse(emailToShareWith).success) {
    return { error: "Invalid email address provided." };
  }

  if (owner.email === emailToShareWith) {
    return { error: "You cannot share a server with yourself." };
  }

  try {
    const client = await clientPromise;
    const db = client.db();

    const server = await db.collection('servers').findOne({
      _id: new ObjectId(serverId),
      ownerId: new ObjectId(owner._id),
    });

    if (!server) {
      return { error: "Server not found or you do not have permission to share it." };
    }

    const userToShareWith = await db.collection('users').findOne({ email: emailToShareWith });
    if (!userToShareWith) {
      return { error: `User with email "${emailToShareWith}" not found.` };
    }
    
    const guestId = new ObjectId(userToShareWith._id);

    // Check if user is already a guest
    const isAlreadyGuest = (server.guestIds || []).some((id: ObjectId) => id.equals(guestId));
    if (isAlreadyGuest) {
        return { error: `This server is already shared with ${emailToShareWith}.` };
    }

    await db.collection('servers').updateOne(
        { _id: new ObjectId(serverId) },
        { $addToSet: { guestIds: guestId } } // Use $addToSet to avoid duplicates
    );
    
    // Create notifications for both owner and guest
    await createNotification(owner._id, `You shared "${server.name}" with ${emailToShareWith}.`, 'server_shared');
    await createNotification(userToShareWith._id.toString(), `${owner.email} shared the server "${server.name}" with you.`, 'server_shared', `/dashboard/server/${serverId}`);

    revalidatePath('/dashboard');

    return { success: true, notification: true };
  } catch (error) {
    console.error("Failed to share server:", error);
    return { error: "An unexpected error occurred." };
  }
}


export async function getServerPrivateKey(serverId: string): Promise<{error?: string; privateKey?: string}> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "You must be logged in." };
  }
  if (!ObjectId.isValid(serverId)) {
    return { error: "Invalid server ID." };
  }
  
  try {
    const client = await clientPromise;
    const db = client.db();

    const server = await db.collection('servers').findOne({ 
      _id: new ObjectId(serverId),
      ownerId: new ObjectId(user._id)
    });

    if (!server) {
      return { error: "Server not found or you do not have permission to download the key." };
    }

    if (!server.privateKey) {
      return { error: "No private key is associated with this server." };
    }

    const decryptedKey = decrypt(server.privateKey);
    return { privateKey: decryptedKey };

  } catch (error) {
    console.error('Failed to fetch private key:', error);
    return { error: 'An unexpected error occurred while retrieving the key.' };
  }
}

// Guest Management Actions

export type GuestAccessDetails = {
    guestId: string;
    guestEmail: string;
    servers: {
      serverId: string;
      serverName: string;
    }[];
}[];

export async function getGuestAccessDetails(): Promise<GuestAccessDetails> {
    const owner = await getCurrentUser();
    if (!owner) {
        return [];
    }
    
    try {
        const client = await clientPromise;
        const db = client.db();
        const ownerId = new ObjectId(owner._id);

        const servers = await db.collection('servers').find({ ownerId }).toArray();

        if (servers.length === 0) {
            return [];
        }

        const guestMap = new Map<string, { guestEmail: string; servers: { serverId: string; serverName: string }[] }>();

        // Get all unique guest IDs from all servers
        const allGuestIds = servers.reduce((acc, server) => {
            if (server.guestIds) {
                acc.push(...server.guestIds);
            }
            return acc;
        }, [] as ObjectId[]);
        
        const uniqueGuestIds = [...new Set(allGuestIds.map(id => id.toString()))].map(id => new ObjectId(id));
        
        if (uniqueGuestIds.length === 0) {
            return [];
        }

        // Fetch all guest user documents in one query
        const guests = await db.collection('users').find({ _id: { $in: uniqueGuestIds } }).toArray();
        const guestUserMap = new Map(guests.map(g => [g._id.toString(), g.email]));


        // Populate the guestMap
        for (const server of servers) {
            if (server.guestIds) {
                for (const guestId of server.guestIds) {
                    const guestIdStr = guestId.toString();
                    const guestEmail = guestUserMap.get(guestIdStr);

                    if (guestEmail) {
                        if (!guestMap.has(guestIdStr)) {
                            guestMap.set(guestIdStr, { guestEmail, servers: [] });
                        }
                        guestMap.get(guestIdStr)!.servers.push({
                            serverId: server._id.toString(),
                            serverName: server.name,
                        });
                    }
                }
            }
        }

        return Array.from(guestMap.entries()).map(([guestId, data]) => ({
            guestId,
            ...data
        }));

    } catch (error) {
        console.error("Failed to get guest access details:", error);
        return [];
    }
}


export async function revokeGuestAccess(serverId: string, guestId: string) {
    const owner = await getCurrentUser();
    if (!owner) {
        return { error: "You must be logged in." };
    }

    if (!ObjectId.isValid(serverId) || !ObjectId.isValid(guestId)) {
        return { error: "Invalid ID provided." };
    }

    try {
        const client = await clientPromise;
        const db = client.db();
        const ownerId = new ObjectId(owner._id);
        const serverObjectId = new ObjectId(serverId);
        const guestObjectId = new ObjectId(guestId);

        const result = await db.collection('servers').updateOne(
            { _id: serverObjectId, ownerId: ownerId },
            { $pull: { guestIds: guestObjectId } as any }
        );

        if (result.matchedCount === 0) {
            return { error: "Server not found or you do not have permission to modify it." };
        }
        if (result.modifiedCount === 0) {
            return { error: "Guest not found on this server or access already revoked." };
        }

        revalidatePath('/dashboard/guests');
        return { success: true };

    } catch (error) {
        console.error("Failed to revoke guest access:", error);
        return { error: "An unexpected error occurred." };
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
): Promise<AuthState & { notification?: boolean }> {
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
  name: z.string().min(1, 'Name is required.'),
  email: z.string().email('Invalid email address.'),
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
): Promise<AuthState & { notification?: boolean }> {
    const user = await getCurrentUser();

    const validatedFields = SupportRequestSchema.safeParse(Object.fromEntries(formData.entries()));

    if (!validatedFields.success) {
        return { error: validatedFields.error.errors[0]?.message || 'Invalid data.' };
    }

    const { name, email, message } = validatedFields.data;
    
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

    if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
        console.error("SMTP environment variables are not set.");
        return { error: "The application is not configured to send emails. Please contact support directly." };
    }

    const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(SMTP_PORT),
        secure: Number(SMTP_PORT) === 465, // true for 465, false for other ports
        auth: {
            user: SMTP_USER,
            pass: SMTP_PASS,
        },
    });

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
        .header { background-color: #4f46e5; color: #ffffff; padding: 24px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 24px; color: #333333; }
        .content h2 { color: #4f46e5; font-size: 18px; margin-top: 0; }
        .info-box { background-color: #f8f8fa; border: 1px solid #e2e2e7; border-radius: 4px; padding: 16px; margin-bottom: 24px; }
        .info-box p { margin: 0 0 8px; }
        .info-box strong { color: #555555; }
        .message-box { white-space: pre-wrap; word-wrap: break-word; background-color: #f8f8fa; border: 1px solid #e2e2e7; padding: 16px; border-radius: 4px; font-family: 'Courier New', Courier, monospace; }
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
            from: `"Remote Commander Support" <${SMTP_USER}>`,
            replyTo: `"${name}" <${email}>`,
            to: "bangarraju1152@gmail.com",
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
