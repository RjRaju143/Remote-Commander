
import { NextRequest, NextResponse } from 'next/server';
import { WebSocketServer, WebSocket } from 'ws';
import { Client } from 'ssh2';
import { verifyJwt, getServerById, decrypt } from '@/lib/server-helpers';
import { Socket } from 'net';

// A map to store active WebSocket servers
const wssMap = new Map<string, WebSocketServer>();

const handleUpgrade = (wss: WebSocketServer, request: NextRequest, socket: Socket, head: Buffer) => {
    wss.handleUpgrade(request as any, socket, head, (ws) => {
        wss.emit('connection', ws, request);
    });
};

const handleConnection = (ws: WebSocket, req: NextRequest) => {
    let sshClient: Client | null = null;
    let sshStream: Client.Channel | null = null;

    const onCloseCleanup = () => {
        if (sshStream) {
            try { sshStream.close(); } catch (e) { }
            sshStream = null;
        }
        if (sshClient) {
            try { sshClient.end(); } catch (e) { }
            sshClient = null;
        }
    };

    ws.on('message', async (raw) => {
        try {
            const msg = JSON.parse(raw.toString());
            const userId = (req as any).user.userId;

            if (msg.type === 'connect') {
                if (sshClient) {
                    ws.send(JSON.stringify({ type: 'error', message: 'Already connected' }));
                    return;
                }

                const serverCreds = await getServerById(msg.serverId, userId);

                if (!serverCreds) {
                    ws.send(JSON.stringify({ type: 'error', message: 'Server not found or permission denied' }));
                    ws.close();
                    return;
                }

                sshClient = new Client();
                sshClient.on('ready', () => {
                    sshClient!.shell({
                        term: 'xterm-256color',
                        cols: msg.cols || 80,
                        rows: msg.rows || 24,
                    }, (err, stream) => {
                        if (err) {
                            ws.send(JSON.stringify({ type: 'error', message: 'Shell error: ' + err.message }));
                            sshClient!.end();
                            return;
                        }
                        sshStream = stream;

                        stream.on('data', (data: Buffer) => {
                            ws.send(JSON.stringify({ type: 'output', data: data.toString('base64') }));
                        });

                        stream.on('close', () => {
                            ws.send(JSON.stringify({ type: 'end' }));
                            onCloseCleanup();
                            ws.close();
                        });

                        stream.stderr.on('data', (data: Buffer) => {
                            ws.send(JSON.stringify({ type: 'output', data: data.toString('base64') }));
                        });

                        ws.send(JSON.stringify({ type: 'ready' }));
                    });
                });

                sshClient.on('error', (err) => {
                    ws.send(JSON.stringify({ type: 'error', message: 'SSH error: ' + err.message }));
                    onCloseCleanup();
                });

                sshClient.on('end', () => {
                    ws.send(JSON.stringify({ type: 'end' }));
                    onCloseCleanup();
                });

                try {
                    const connConfig = {
                        host: serverCreds.ip,
                        port: Number(serverCreds.port) || 22,
                        username: serverCreds.username,
                        privateKey: serverCreds.privateKey ? decrypt(serverCreds.privateKey) : undefined,
                        readyTimeout: 20000,
                    };

                    sshClient.connect(connConfig);

                } catch (e: any) {
                    ws.send(JSON.stringify({ type: 'error', message: 'Connect exception: ' + e.message }));
                    onCloseCleanup();
                }

            } else if (msg.type === 'input') {
                if (sshStream) {
                    const buf = Buffer.from(msg.data, 'base64');
                    sshStream.write(buf);
                }
            } else if (msg.type === 'resize') {
                if (sshStream) {
                    try { sshStream.setWindow(msg.rows, msg.cols, 0, 0); } catch (e) { }
                }
            } else if (msg.type === 'disconnect') {
                onCloseCleanup();
            } else {
                ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
            }
        } catch (err) {
            ws.send(JSON.stringify({ type: 'error', message: 'Bad message format' }));
        }
    });

    ws.on('close', onCloseCleanup);
    ws.on('error', onCloseCleanup);
};

export async function GET(request: NextRequest) {
    const server = (request.headers as any).get('x-forwarded-server') || 'default';
    let wss = wssMap.get(server);
    if (!wss) {
        wss = new WebSocketServer({ noServer: true });
        wssMap.set(server, wss);

        wss.on('connection', (ws, req) => handleConnection(ws, req as NextRequest));
    }
    
    const socket = (request as any).socket as Socket;
    const head = Buffer.alloc(0);

    const sessionToken = request.cookies.get('session')?.value;

    if (!sessionToken) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return new NextResponse(null, { status: 401 });
    }

    try {
        const decoded = await verifyJwt(sessionToken);
        if (!decoded || !decoded.userId) {
            throw new Error('Invalid token');
        }
        // Attach user info to the request for the connection handler
        (request as any).user = decoded;

        handleUpgrade(wss, request, socket, head);
    } catch (err) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return new NextResponse(null, { status: 401 });
    }

    // We have to return a response to satisfy Next.js, but the connection is being hijacked.
    // The status code here doesn't really matter as the client won't see it.
    return new NextResponse(null, { status: 101 });
}
