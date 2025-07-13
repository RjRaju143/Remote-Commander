
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { WebglAddon } from '@xterm/addon-webgl';
import '@xterm/xterm/css/xterm.css';
import { handleExecuteCommand } from '@/lib/actions';
import { Loader2 } from 'lucide-react';

export function Shell({ serverId, username }: { serverId: string, username: string }) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const term = useRef<Terminal | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const commandHistory = useRef<string[]>([]);
  const historyIndex = useRef<number>(-1);
  let currentCommand = '';

  const prompt = () => {
    currentCommand = '';
    term.current?.write(`\r\n\x1b[1;32m${username}@server\x1b[0m:\x1b[1;34m~\x1b[0m$ `);
  };

  const execute = async (command: string) => {
    setIsLoading(true);
    if (command.trim() !== '') {
      commandHistory.current.push(command);
    }
    historyIndex.current = commandHistory.current.length;

    const formData = new FormData();
    formData.append('command', command);
    
    const result = await handleExecuteCommand(serverId, {}, formData);
    
    if (term.current) {
      const output = result.error || result.result || '';
      const sanitizedOutput = output.replace(/\r?\n/g, '\r\n');
      term.current.write('\r\n' + sanitizedOutput);
    }

    setIsLoading(false);
    prompt();
  };

  useEffect(() => {
    if (!terminalRef.current || term.current) {
      return;
    }

    const terminal = new Terminal({
      cursorBlink: true,
      convertEol: true,
      fontFamily: `'Source Code Pro', monospace`,
      fontSize: 15,
      theme: {
        background: '#18181b', 
        foreground: '#e4e4e7'  
      }
    });
    term.current = terminal;

    const currentFitAddon = new FitAddon();
    fitAddon.current = currentFitAddon;
    terminal.loadAddon(currentFitAddon);
    terminal.loadAddon(new WebLinksAddon());
    
    try {
        const webglAddon = new WebglAddon();
        terminal.loadAddon(webglAddon);
    } catch(e) {
        console.warn("WebGL addon failed to load, falling back to canvas renderer.");
    }
    
    terminal.open(terminalRef.current);
    currentFitAddon.fit();

    terminal.write('Welcome to Remote Commander Shell\r\n');
    terminal.write('Type a command and press Enter to execute.\r\n');
    prompt();

    terminal.onData((e) => {
      switch (e) {
        case '\r': // Enter
          if (currentCommand.trim()) {
            execute(currentCommand);
          } else {
            term.current?.write('\r\n');
            prompt();
          }
          break;
        case '\u007F': // Backspace
          if (currentCommand.length > 0) {
            terminal.write('\b \b');
            currentCommand = currentCommand.slice(0, -1);
          }
          break;
        case '\u0003': // Ctrl+C
            prompt();
            break;
        case '\u001b[A': // Up arrow
            if(historyIndex.current > 0) {
                historyIndex.current--;
                const cmd = commandHistory.current[historyIndex.current];
                terminal.write('\x1b[2K\r'); // Clear line
                prompt();
                terminal.write(cmd);
                currentCommand = cmd;
            }
            break;
        case '\u001b[B': // Down arrow
            if(historyIndex.current < commandHistory.current.length - 1) {
                historyIndex.current++;
                const cmd = commandHistory.current[historyIndex.current];
                terminal.write('\x1b[2K\r'); // Clear line
                prompt();
                terminal.write(cmd);
                currentCommand = cmd;
            } else {
                historyIndex.current = commandHistory.current.length;
                terminal.write('\x1b[2K\r'); // Clear line
                prompt();
                currentCommand = '';
            }
            break;
        default:
          if (e >= String.fromCharCode(0x20) && e <= String.fromCharCode(0x7e)) {
            currentCommand += e;
            terminal.write(e);
          }
      }
    });

    const handleResize = () => fitAddon.current?.fit();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      terminal.dispose();
      term.current = null;
    };
  }, [serverId, username]);

  return (
    <div className="relative h-full w-full rounded-lg border bg-[#18181b] p-4">
      <div ref={terminalRef} className="h-full w-full" />
      {isLoading && (
        <div className="absolute top-4 right-4 text-white bg-black/50 p-2 rounded-md">
            <Loader2 className="animate-spin" />
        </div>
      )}
    </div>
  );
}
