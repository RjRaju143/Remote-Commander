
import clientPromise from "./mongodb";
import { ObjectId } from "mongodb";
import CryptoJS from "crypto-js";
import type { Server } from "./types";
import { isUserAdmin } from "./auth";


export async function getServerById(serverId: string, userId?: string | null): Promise<Server | null> {
  if (!userId) return null;
  
  if (!ObjectId.isValid(serverId) || !ObjectId.isValid(userId)) return null;

  const serverObjectId = new ObjectId(serverId);
  const userObjectId = new ObjectId(userId);

  try {
    const client = await clientPromise;
    const db = client.db();

    const user = await db.collection('users').findOne({ _id: userObjectId });
    if (!user) return null;
    
    const userIsAdmin = (user.roles as string[])?.includes('admin');

    const server = await db.collection('servers').findOne({ _id: serverObjectId });
    if (!server) return null;

    // Now check permissions
    const isOwner = server.ownerId.equals(userObjectId);
    const isGuest = server.guestIds?.some((guestId: ObjectId) => guestId.equals(userObjectId));
    
    if (!userIsAdmin && !isOwner && !isGuest) {
      return null; // No access
    }

    const serverDoc = server as any;
    const serverData = JSON.parse(JSON.stringify(serverDoc));
    return { ...serverData, id: serverData._id.toString() };

  } catch (error) {
    console.error("Failed to fetch server:", error);
    return null;
  }
}

// Encryption/Decryption functions
export function encrypt(text: string): string {
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret) {
    throw new Error('ENCRYPTION_SECRET is not set in the environment variables.');
  }
  return CryptoJS.AES.encrypt(text, secret).toString();
}

export function decrypt(ciphertext: string): string {
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret) {
    throw new Error('ENCRYPTION_SECRET is not set in the environment variables.');
  }
  const bytes = CryptoJS.AES.decrypt(ciphertext, secret);
  return bytes.toString(CryptoJS.enc.Utf8);
}
