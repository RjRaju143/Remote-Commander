
import clientPromise from "./mongodb";
import { ObjectId } from "mongodb";
import { jwtVerify } from "jose";
import CryptoJS from "crypto-js";
import type { Server } from "./types";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is not set.");
}
const secret = new TextEncoder().encode(JWT_SECRET);

export async function verifyJwt(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (error) {
    return null;
  }
}

export async function getServerById(serverId: string, userId: string | null): Promise<Server | null> {
  if (!userId) return null;
  
  if (!ObjectId.isValid(serverId) || !ObjectId.isValid(userId)) return null;

  const serverObjectId = new ObjectId(serverId);
  const userObjectId = new ObjectId(userId);

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
