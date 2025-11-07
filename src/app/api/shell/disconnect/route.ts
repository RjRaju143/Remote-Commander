
'use server';

import { NextRequest, NextResponse } from 'next/server';

// This should match the type in connect/route.ts
const sessions = new Map<string, { client: any, stream: any, buffer: string }>();

export async function POST(request: NextRequest) {
  const { sessionId } = await request.json();

  if (sessionId) {
    const session = sessions.get(sessionId);
    if (session) {
      session.stream.close();
      session.client.end();
      sessions.delete(sessionId);
    }
  }

  return NextResponse.json({ message: 'Disconnected' });
}
