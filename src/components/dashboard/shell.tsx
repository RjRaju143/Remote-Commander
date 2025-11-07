'use client';

import React, { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { WebglAddon } from '@xterm/addon-webgl';
import '@xterm/xterm/css/xterm.css';
import { useWebSocket } from 'next-ws/client';

export function Shell({ serverId, username }: { serverId: string; username: string }) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const term = useRef<Terminal | null>(null);
  const ws = useWebSocket();

  useEffect(() => {
    if (!terminalRef.current || !ws.current) return;

    const xterm = new Terminal({
      cursorBlink: true,
      convertEol: true,
      fontFamily: `'Source Code Pro', monospace`,
      fontSize: 15,
      theme: {
        background: '#18181b',
        foreground: '#e4e4e7',
      },
    });
    term.current = xterm;
    
    const fitAddon = new FitAddon();
    xterm.loadAddon(fitAddon);
    xterm.loadAddon(new WebLinksAddon());
    try {
        const webglAddon = new WebglAddon();
        xterm.loadAddon(webglAddon);
    } catch(e) {
        console.warn("WebGL addon failed to load, falling back to canvas renderer.");
    }
    
    xterm.open(terminalRef.current);
    fitAddon.fit();

    ws.current.send(JSON.stringify({
        type: 'connect',
        serverId: serverId,
        cols: xterm.cols,
        rows: xterm.rows,
    }));

    ws.current.onmessage = (event) => {
        try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'output') {
                const data = atob(msg.data);
                xterm.write(data);
            } else if (msg.type === 'ready') {
                xterm.write('\r\n\x1b[1;32m*** SSH Shell Ready ***\x1b[0m\r\n');
            } else if (msg.type === 'end') {
                xterm.write('\r\n\x1b[1;31m*** Connection Closed ***\x1b[0m\r\n');
            } else if (msg.type === 'error') {
                xterm.write(`\r\n\x1b[1;31m*** ERROR: ${msg.message} ***\x1b[0m\r\n`);
            }
        } catch (e) {
            console.error("Invalid WS message", e);
        }
    };
    
    ws.current.onclose = () => {
        xterm.write('\r\n\x1b[1;33m*** WebSocket Disconnected ***\x1b[0m\r\n');
    };
    
    ws.current.onerror = (err) => {
        console.error('WebSocket Error:', err);
        xterm.write('\r\n\x1b[1;31m*** A WebSocket error occurred ***\x1b[0m\r\n');
    };


    xterm.onData(data => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ type: 'input', data: btoa(data) }));
        }
    });

    const handleResize = () => {
      fitAddon.fit();
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({
          type: 'resize',
          cols: xterm.cols,
          rows: xterm.rows,
        }));
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(terminalRef.current);
    
    window.addEventListener('resize', handleResize);

    return () => {
        window.removeEventListener('resize', handleResize);
        resizeObserver.disconnect();
        xterm.dispose();
    };
  }, [serverId, ws]);

  return <div ref={terminalRef} className="h-full w-full" />;
}
