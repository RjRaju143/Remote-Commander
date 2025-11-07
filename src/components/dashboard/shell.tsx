'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { WebglAddon } from '@xterm/addon-webgl';
import '@xterm/xterm/css/xterm.css';

function getWebSocketUrl() {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const host = window.location.host;
    return `${protocol}://${host}/api/ws`;
}

export function Shell({ serverId, username }: { serverId: string; username: string }) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const term = useRef<Terminal | null>(null);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    // Create a new Terminal instance
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
    
    // Load addons
    const fitAddon = new FitAddon();
    xterm.loadAddon(fitAddon);
    xterm.loadAddon(new WebLinksAddon());
    try {
        const webglAddon = new WebglAddon();
        xterm.loadAddon(webglAddon);
    } catch(e) {
        console.warn("WebGL addon failed to load, falling back to canvas renderer.");
    }
    
    // Open the terminal in the ref
    xterm.open(terminalRef.current);
    fitAddon.fit();

    // Create WebSocket connection
    const socket = new WebSocket(getWebSocketUrl());
    ws.current = socket;

    socket.onopen = () => {
        // Send connection message
        socket.send(JSON.stringify({
            type: 'connect',
            serverId: serverId,
            cols: xterm.cols,
            rows: xterm.rows,
        }));
    };

    socket.onmessage = (event) => {
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
    
    socket.onclose = () => {
        xterm.write('\r\n\x1b[1;33m*** WebSocket Disconnected ***\x1b[0m\r\n');
    };
    
    socket.onerror = (err) => {
        console.error('WebSocket Error:', err);
        xterm.write('\r\n\x1b[1;31m*** A WebSocket error occurred ***\x1b[0m\r\n');
    };

    // Handle terminal input
    xterm.onData(data => {
        if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'input', data: btoa(data) }));
        }
    });

    // Handle resize
    const handleResize = () => {
      fitAddon.fit();
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: 'resize',
          cols: xterm.cols,
          rows: xterm.rows,
        }));
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    if (terminalRef.current) {
        resizeObserver.observe(terminalRef.current);
    }
    window.addEventListener('resize', handleResize);

    // Cleanup on unmount
    return () => {
        window.removeEventListener('resize', handleResize);
        if (terminalRef.current) {
            resizeObserver.unobserve(terminalRef.current);
        }
        socket.close();
        xterm.dispose();
    };
  }, [serverId, username]);

  return <div ref={terminalRef} className="h-full w-full" />;
}