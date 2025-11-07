
import type { Client } from 'ssh2';

// This needs to be managed carefully. In a real-world scenario with multiple server instances,
// you'd use a more persistent store like Redis. For a single-instance deployment, 
// this shared in-memory map is sufficient.
// We are centralizing it here so all API routes access the same instance.
interface SshSession {
    client: Client;
    stream: Client.Channel;
    buffer: string;
}

// In development mode, use a global variable to preserve the value across HMR.
// In production, this will just be a module-scoped variable.
let globalWithSshSessions = global as typeof globalThis & {
    _sshSessions?: Map<string, SshSession>
}

const sessions = globalWithSshSessions._sshSessions || (globalWithSshSessions._sshSessions = new Map<string, SshSession>());


export function getSession(sessionId: string): SshSession | undefined {
    return sessions.get(sessionId);
}

export function addSession(sessionId: string, session: SshSession): void {
    sessions.set(sessionId, session);
}

export function deleteSession(sessionId: string): void {
    const session = sessions.get(sessionId);
    if (session) {
        session.stream?.close();
        session.client?.end();
        sessions.delete(sessionId);
    }
}
