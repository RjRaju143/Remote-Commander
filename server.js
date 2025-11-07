const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { WebSocketServer } = require('ws');
const { Client } = require('ssh2');
const { verifyJwt, getServerById, decrypt } = require('./dist/lib/actions');
const cookieParser = require('cookie-parser');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    // Be sure to pass `true` as the second argument to `url.parse`.
    // This tells it to parse the query portion of the URL.
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    // Use cookie-parser middleware to parse cookies
    cookieParser()(request, {}, () => {
      const sessionToken = request.cookies.session;
  
      if (!sessionToken) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }
      
      verifyJwt(sessionToken).then(decoded => {
        if (!decoded) {
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
            return;
        }
        
        // Attach user info to the request for the connection handler
        request.user = decoded;

        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request);
        });
      });
    });
  });

  wss.on('connection', (ws, req) => {
    let sshClient = null;
    let sshStream = null;

    const onCloseCleanup = () => {
        if (sshStream) {
            try { sshStream.close(); } catch(e){}
            sshStream = null;
        }
        if (sshClient) {
            try { sshClient.end(); } catch(e){}
            sshClient = null;
        }
    };

    ws.on('message', async (raw) => {
        try {
            const msg = JSON.parse(raw.toString());

            if (msg.type === 'connect') {
                if (sshClient) {
                    ws.send(JSON.stringify({ type: 'error', message: 'Already connected' }));
                    return;
                }

                const serverCreds = await getServerById(msg.serverId);

                if (!serverCreds) {
                    ws.send(JSON.stringify({ type: 'error', message: 'Server not found or permission denied' }));
                    ws.close();
                    return;
                }

                sshClient = new Client();
                sshClient.on('ready', () => {
                    sshClient.shell({
                        term: 'xterm-256color',
                        cols: msg.cols || 80,
                        rows: msg.rows || 24,
                    }, (err, stream) => {
                        if (err) {
                            ws.send(JSON.stringify({ type: 'error', message: 'Shell error: ' + err.message }));
                            sshClient.end();
                            return;
                        }
                        sshStream = stream;

                        stream.on('data', (data) => {
                            ws.send(JSON.stringify({ type: 'output', data: data.toString('base64') }));
                        });

                        stream.on('close', () => {
                            ws.send(JSON.stringify({ type: 'end' }));
                            onCloseCleanup();
                            ws.close();
                        });

                        stream.stderr.on('data', (data) => {
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
                        port: serverCreds.port || 22,
                        username: serverCreds.username,
                        privateKey: serverCreds.privateKey ? decrypt(serverCreds.privateKey) : undefined,
                        readyTimeout: 20000,
                    };
                    
                    sshClient.connect(connConfig);

                } catch (e) {
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
                    try { sshStream.setWindow(msg.rows, msg.cols); } catch (e) {}
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
  });

  const port = process.env.PORT || 3000;
  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${port}`);
  });
});
