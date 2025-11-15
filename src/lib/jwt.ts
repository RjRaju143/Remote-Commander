
'use server';

// This file is no longer used for authentication but is kept to prevent breaking imports.
// The authentication logic has been moved to a session-based system.
// You can safely remove this file if all imports have been updated.

import { Role } from "./auth";

// Dummy payload to satisfy type imports.
export interface CustomJwtPayload {
  userId: string;
  email: string;
  roles: Role[];
}

export async function verifyJwt(token: string): Promise<CustomJwtPayload | null> {
  // This function is deprecated. Session-based auth is used instead.
  console.warn("verifyJwt is deprecated and should not be used. Switch to session-based authentication.");
  return null;
}
