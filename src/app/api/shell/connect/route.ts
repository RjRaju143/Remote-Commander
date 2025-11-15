
'use server';

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/actions';
import { getServerById, decrypt } from '@/lib/server-helpers';
import { Client } from 'ssh2';
import { addSession, deleteSession } from '@/lib/shell-sessions';
import { canUser } from '@/lib/auth';
import { Permission } from '@/lib/types';

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
  }

  const { serverId, cols, rows } = await request.json();

  if (!serverId) {
    return NextResponse.json({ message: 'Server ID is required' }, { status: 400 });
  }

  const serverCreds = await getServerById(serverId, user._id);
  if (!serverCreds) {
    return NextResponse.json({ message: 'Server not found or permission denied' }, { status: 404 });
  }
  
  const hasPermission = await canUser(serverCreds, Permission.EXECUTE, user);
  if (!hasPermission) {
    return NextResponse.json({ message: 'Permission denied to execute commands on this server' }, { status: 403 });
  }

  const client = new Client();
  const sessionId = crypto.randomUUID();

  const connectPromise = new Promise<void>((resolve, reject) => {
    client.on('ready', () => {
      client.shell({ term: 'xterm-256color', cols: cols || 80, rows: rows || 24 }, (err, stream) => {
        if (err) {
          return reject(err);
        }

        const sessionData = { client, stream, buffer: '' };
        addSession(sessionId, sessionData);

        stream.on('data', (data: Buffer) => {
          sessionData.buffer += data.toString('binary');
        });

        stream.on('close', () => {
          deleteSession(sessionId);
        });
        
        resolve();
      });
    }).on('error', (err) => {
      reject(err);
    }).on('end', () => {
      deleteSession(sessionId);
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
    deleteSession(sessionId);
    return NextResponse.json({ message: `SSH Connection Error: ${error.message}` }, { status: 500 });
  }
}
