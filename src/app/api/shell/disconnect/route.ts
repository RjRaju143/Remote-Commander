
'use server';

import { NextRequest, NextResponse } from 'next/server';
import { deleteSession } from '@/lib/shell-sessions';

export async function POST(request: NextRequest) {
  const { sessionId } = await request.json();

  if (sessionId) {
    deleteSession(sessionId);
  }

  return NextResponse.json({ message: 'Disconnected' });
}
