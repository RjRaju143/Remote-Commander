import clientPromise from "./mongodb";
import { ObjectId } from "mongodb";
import CryptoJS from "crypto-js";
import type { Server } from "./types";
import { isUserAdmin } from "./auth";
import { getCurrentUser } from "./actions";

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
