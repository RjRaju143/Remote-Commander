// src/app/api/auth/session/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import type { User } from '@/models/User';

export async function POST(request: NextRequest) {
  const { sessionId } = await request.json();

  if (!sessionId) {
    return NextResponse.json({ user: null }, { status: 400 });
  }

  try {
    const client = await clientPromise;
    const db = client.db();

    const session = await db.collection('sessions').findOne({
      sessionId: sessionId,
      expiresAt: { $gt: new Date() }
    });

    if (!session) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const user = await db.collection('users').findOne({ _id: session.userId });

    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    // Sanitize user data before sending
    const { password, ...userWithoutPassword } = user;
    const plainUser = JSON.parse(JSON.stringify(userWithoutPassword));
    plainUser._id = plainUser._id.toString();
    plainUser.favorites = plainUser.favorites?.map((id: ObjectId | string) => id.toString()) || [];
    plainUser.roles = plainUser.roles || ['user'];

    return NextResponse.json({ user: plainUser });
  } catch (error) {
    console.error("Session validation API error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
