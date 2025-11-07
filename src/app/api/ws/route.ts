'use server';

import {NextRequest, NextResponse} from 'next/server';
import {verifyJwt} from '@/lib/jwt';
import {getServerById, decrypt} from '@/lib/server-helpers';
import {Client} from 'ssh2';
import type {Socket} from 'net';
import WebSocket from 'ws';

export async function GET(request: NextRequest) {
  const sessionToken = request.cookies.get('session')?.value;
  if (!sessionToken) {
    return new NextResponse('Authentication error', {status: 401});
  }

  const decoded = await verifyJwt(sessionToken);
  if (!decoded || !decoded.userId) {
    return new NextResponse('Authentication error', {status: 401});
  }
  const userId = decoded.userId as string;

  const res = new NextResponse();
  const socket: Socket = (res.socket as any) ?? {
    server: {
      on: () => {},
    },
    on: () => {},
    removeListener: () => {},
    end: () => {},
    destroy: () => {},
  };

  const wss = new WebSocket.Server({noServer: true});
  socket.server.on('upgrade', (req, sock, head) => {
    wss.handleUpgrade(req, sock, head, ws => {
      wss.emit('connection', ws, req);
    });
  });

  wss.on('connection', async ws => {
    let sshClient: Client | null = null;
    let sshStream: Client.Channel | null = null;

    const onCloseCleanup = () => {
      sshStream?.close();
      sshClient?.end();
      sshStream = null;
      sshClient = null;
    };

    ws.on('message', async raw => {
      try {
        const msg = JSON.parse(raw.toString());

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
          sshClient
            .on('ready', () => {
              sshClient!.shell(
                {
                  term: 'xterm-256color',
                  cols: msg.cols || 80,
                  rows: msg.rows || 24,
                },
                (err, stream) => {
                  if (err) {
                    ws.send(
                      JSON.stringify({
                        type: 'error',
                        message: 'Shell error: ' + err.message,
                      })
                    );
                    sshClient!.end();
                    return;
                  }
                  sshStream = stream;

                  stream
                    .on('data', (data: Buffer) => {
                      ws.send(JSON.stringify({type: 'output', data: data.toString('base64')}));
                    })
                    .on('close', () => {
                      ws.send(JSON.stringify({type: 'end'}));
                      onCloseCleanup();
                      ws.close();
                    })
                    .stderr.on('data', (data: Buffer) => {
                      ws.send(JSON.stringify({type: 'output', data: data.toString('base64')}));
                    });

                  ws.send(JSON.stringify({type: 'ready'}));
                }
              );
            })
            .on('error', err => {
              ws.send(JSON.stringify({type: 'error', message: 'SSH error: ' + err.message}));
              onCloseCleanup();
            })
            .on('end', () => {
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
            ws.send(JSON.stringify({type: 'error', message: 'Connect exception: ' + e.message}));
            onCloseCleanup();
          }
        } else if (msg.type === 'input') {
          if (sshStream) {
            sshStream.write(Buffer.from(msg.data, 'base64'));
          }
        } else if (msg.type === 'resize') {
          if (sshStream) {
            sshStream.setWindow(msg.rows, msg.cols, 0, 0);
          }
        } else if (msg.type === 'disconnect') {
          onCloseCleanup();
        }
      } catch (err) {
        ws.send(JSON.stringify({type: 'error', message: 'Bad message format'}));
      }
    });

    ws.on('close', onCloseCleanup);
    ws.on('error', onCloseCleanup);
  });

  return new NextResponse(null, {
    status: 101, // Switching Protocols
  });
}