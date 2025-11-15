'use client';

import React, { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { WebglAddon } from '@xterm/addon-webgl';
import '@xterm/xterm/css/xterm.css';

const POLLING_INTERVAL = 300; // ms

// Helper to make API calls
async function fetchApi(path: string, options: RequestInit = {}) {
    const res = await fetch(path, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'An unknown error occurred' }));
        const error = new Error(errorData.message || 'API request failed');
        (error as any).status = res.status;
        throw error;
    }
    return res.json();
}

export function Shell({ serverId }: { serverId: string; username: string }) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const term = useRef<Terminal | null>(null);
  const sessionId = useRef<string | null>(null);
  const pollTimeoutId = useRef<NodeJS.Timeout | null>(null);
  const isUnmounted = useRef(false);

  // Polling function to get output from the server
  const pollForOutput = async () => {
    if (!sessionId.current || isUnmounted.current) return;

    try {
      const { output } = await fetchApi(`/api/shell/${sessionId.current}`);
      if (output && term.current) {
        term.current.write(atob(output));
      }
    } catch (error: any) {
        // If the session is not found, it means it was closed (e.g., by typing 'exit').
        // We can stop polling and avoid showing an error.
        if (error.status === 404) {
            console.log("Session ended. Stopping polling.");
            if (term.current) {
                term.current.write(`\r\n\x1b[1;33m*** Connection closed ***\x1b[0m\r\n`);
            }
            return;
        }

        console.error('Polling error:', error);
        if (term.current) {
            term.current.write(`\r\n\x1b[1;31m*** Polling failed: ${(error as Error).message} ***\x1b[0m\r\n`);
        }
        // Stop polling on other errors
        return;
    }

    if (!isUnmounted.current) {
      pollTimeoutId.current = setTimeout(pollForOutput, POLLING_INTERVAL);
    }
  };

  const connect = async (cols: number, rows: number) => {
    if (!term.current) return;
    try {
        term.current.write('Attempting to connect to server...');
        const data = await fetchApi('/api/shell/connect', {
            method: 'POST',
            body: JSON.stringify({ serverId, cols, rows }),
        });

        if (data.sessionId) {
            sessionId.current = data.sessionId;
            term.current.write('\r\n\x1b[1;32m*** SSH Shell Ready ***\x1b[0m\r\n');
            // Start polling for output
            pollForOutput();
        } else {
            throw new Error(data.message || 'Failed to get session ID.');
        }
    } catch (error) {
        console.error('Connection error:', error);
        term.current.write(`\r\n\x1b[1;31m*** Connection failed: ${(error as Error).message} ***\x1b[0m\r`n`);
    }
  }

  const disconnect = () => {
    if (sessionId.current) {
      // Don't wait for the response, just fire and forget
      fetchApi('/api/shell/disconnect', {
          method: 'POST',
          body: JSON.stringify({ sessionId: sessionId.current }),
      }).catch(err => console.error("Error during disconnect:", err));
      sessionId.current = null;
    }
  };

  useEffect(() => {
    if (!terminalRef.current) return;
    isUnmounted.current = false;

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
    
    // Add a small delay to prevent race condition on initial load
    setTimeout(() => {
        fitAddon.fit();
    }, 10);
    
    connect(xterm.cols, xterm.rows);

    xterm.onData(async (data) => {
        if (sessionId.current) {
            try {
                await fetchApi(`/api/shell/${sessionId.current}`, {
                    method: 'POST',
                    body: JSON.stringify({ input: btoa(data) }),
                });
            } catch (error) {
                console.error('Input error:', error);
                xterm.write(`\r\n\x1b[1;31m*** Failed to send input: ${(error as Error).message} ***\x1b[0m\r\n`);
            }
        }
    });

    const handleResize = () => {
      fitAddon.fit();
    };
    const resizeObserver = new ResizeObserver(handleResize);
    if (terminalRef.current) {
      resizeObserver.observe(terminalRef.current);
    }

    return () => {
      isUnmounted.current = true;
      if (pollTimeoutId.current) {
        clearTimeout(pollTimeoutId.current);
      }
      disconnect();
      if (terminalRef.current) {
        resizeObserver.unobserve(terminalRef.current);
      }
      xterm.dispose();
    };
  }, [serverId]);

  return <div ref={terminalRef} className="h-full w-full" />;
}
