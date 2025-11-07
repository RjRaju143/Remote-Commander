
'use client';

import {NextRequest, NextResponse} from 'next/server';
import {createServer} from 'node:http';
import {NextWS, WebSocket, WebSocketServer} from 'next-ws';
import {Client} from 'ssh2';
import {verifyJwt} from '@/lib/jwt';
import {getServerById, decrypt} from '@/lib/server-helpers';

// A map to store active WebSocket servers
const {api, websocket} = NextWS(
  '/',
  createServer((req, res) => {
    res.end();
  }),
  new WebSocketServer({noServer: true})
);

websocket(async (ws, req) => {
  let sshClient: Client | null = null;
  let sshStream: Client.Channel | null = null;

  const onCloseCleanup = () => {
    if (sshStream) {
      try {
        sshStream.close();
      } catch (e) {}
      sshStream = null;
    }
    if (sshClient) {
      try {
        sshClient.end();
      } catch (e) {}
      sshClient = null;
    }
  };

  ws.on('message', async raw => {
    try {
      const msg = JSON.parse(raw.toString());
      const userId = (req as any).user.userId;

      if (msg.type === 'connect') {
        if (sshClient) {
          ws.send(JSON.stringify({type: 'error', message: 'Already connected'}));
          return;
        }

        const serverCreds = await getServerById(msg.serverId, userId);

        if (!serverCreds) {
          ws.send(
            JSON.stringify({
              type: 'error',
              message: 'Server not found or permission denied',
            })
          );
          ws.close();
          return;
        }

        sshClient = new Client();
        sshClient.on('ready', () => {
          sshClient!.shell(
            {
              term: 'xterm-256color',
              cols: msg.cols || 80,
              rows: msg.rows || 24,
            },
            (err, stream) => {
              if (err) {
                ws.send(
                  JSON.stringify({type: 'error', message: 'Shell error: ' + err.message})
                );
                sshClient!.end();
                return;
              }
              sshStream = stream;

              stream.on('data', (data: Buffer) => {
                ws.send(JSON.stringify({type: 'output', data: data.toString('base64')}));
              });

              stream.on('close', () => {
                ws.send(JSON.stringify({type: 'end'}));
                onCloseCleanup();
                ws.close();
              });

              stream.stderr.on('data', (data: Buffer) => {
                ws.send(JSON.stringify({type: 'output', data: data.toString('base64')}));
              });

              ws.send(JSON.stringify({type: 'ready'}));
            }
          );
        });

        sshClient.on('error', err => {
          ws.send(
            JSON.stringify({type: 'error', message: 'SSH error: ' + err.message})
          );
          onCloseCleanup();
        });

        sshClient.on('end', () => {
          ws.send(JSON.stringify({type: 'end'}));
          onCloseCleanup();
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

          sshClient.connect(connConfig);
        } catch (e: any) {
          ws.send(
            JSON.stringify({type: 'error', message: 'Connect exception: ' + e.message})
          );
          onCloseCleanup();
        }
      } else if (msg.type === 'input') {
        if (sshStream) {
          const buf = Buffer.from(msg.data, 'base64');
          sshStream.write(buf);
        }
      } else if (msg.type === 'resize') {
        if (sshStream) {
          try {
            sshStream.setWindow(msg.rows, msg.cols, 0, 0);
          } catch (e) {}
        }
      } else if (msg.type === 'disconnect') {
        onCloseCleanup();
      } else {
        ws.send(JSON.stringify({type: 'error', message: 'Unknown message type'}));
      }
    } catch (err) {
      ws.send(JSON.stringify({type: 'error', message: 'Bad message format'}));
    }
  });

  ws.on('close', onCloseCleanup);
  ws.on('error', onCloseCleanup);
});

export async function GET(request: NextRequest) {
  const sessionToken = request.cookies.get('session')?.value;

  if (!sessionToken) {
    return new NextResponse(null, {status: 401});
  }

  try {
    const decoded = await verifyJwt(sessionToken);
    if (!decoded || !decoded.userId) {
      throw new Error('Invalid token');
    }
    // Attach user info to the request for the connection handler
    (request as any).user = decoded;

    return await api(request);
  } catch (err) {
    return new NextResponse(null, {status: 401});
  }
}
