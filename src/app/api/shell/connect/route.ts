
'use server';

import { NextRequest, NextResponse } from 'next/server';
import { verifyJwt } from '@/lib/jwt';
import { getServerById, decrypt } from '@/lib/server-helpers';
import { Client } from 'ssh2';
import { randomUUID } from 'crypto';

// In-memory store for active SSH sessions
const sessions = new Map<string, { client: Client, stream: Client.Channel, buffer: string }>();

export async function POST(request: NextRequest) {
  const sessionToken = request.cookies.get('session')?.value;
  if (!sessionToken) {
    return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
  }

  const decoded = await verifyJwt(sessionToken);
  if (!decoded || !decoded.userId) {
    return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
  }
  const userId = decoded.userId as string;

  const { serverId, cols, rows } = await request.json();

  if (!serverId) {
    return NextResponse.json({ message: 'Server ID is required' }, { status: 400 });
  }

  const serverCreds = await getServerById(serverId, userId);
  if (!serverCreds) {
    return NextResponse.json({ message: 'Server not found or permission denied' }, { status: 404 });
  }

  const client = new Client();
  const sessionId = randomUUID();

  const connectPromise = new Promise<void>((resolve, reject) => {
    client.on('ready', () => {
      client.shell({ term: 'xterm-256color', cols: cols || 80, rows: rows || 24 }, (err, stream) => {
        if (err) {
          return reject(err);
        }

        const sessionData = { client, stream, buffer: '' };
        sessions.set(sessionId, sessionData);

        stream.on('data', (data: Buffer) => {
          sessionData.buffer += data.toString('binary');
        });

        stream.on('close', () => {
          sessions.delete(sessionId);
          client.end();
        });
        
        resolve();
      });
    }).on('error', (err) => {
      reject(err);
    }).on('end', () => {
      sessions.delete(sessionId);
    });

    try {
        const connConfig: any = {
            host: serverCreds.ip,
            port: Number(serverCreds.port) || 22,
            username: serverCreds.username,
            readyTimeout: 20000,
        };

        if (serverCreds.privateKey) {
            connConfig.privateKey = decrypt(serverCreds.privateKey);
        }

        client.connect(connConfig);
    } catch (e: any) {
        reject(e);
    }
  });

  try {
    await connectPromise;
    return NextResponse.json({ sessionId });
  } catch (error: any) {
    console.error(`SSH connection error for session ${sessionId}:`, error);
    return NextResponse.json({ message: `SSH Connection Error: ${error.message}` }, { status: 500 });
  }
}
