
'use server';

import { jwtVerify, JWTPayload } from "jose";
import { Role } from "./auth";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is not set.");
}
const secret = new TextEncoder().encode(JWT_SECRET);

export interface CustomJwtPayload extends JWTPayload {
  userId: string;
  email: string;
  roles: Role[];
}

export async function verifyJwt(token: string): Promise<CustomJwtPayload | null> {
  try {
    const { payload } = await jwtVerify<CustomJwtPayload>(token, secret);
    return payload;
  } catch (error) {
    return null;
  }
}
