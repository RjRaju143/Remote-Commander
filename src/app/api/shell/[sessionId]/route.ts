
'use server';

import { NextRequest, NextResponse } from 'next/server';

// This map needs to be managed carefully. In a real-world scenario,
// you'd use a more persistent store like Redis if you had multiple server instances.
// For a single-instance deployment, this in-memory map is sufficient.
const sessions = new Map<string, { client: any, stream: any, buffer: string }>();

// GET request handler for polling output
export async function GET(request: NextRequest, { params }: { params: { sessionId: string } }) {
    const sessionId = params.sessionId;
    const session = sessions.get(sessionId);

    if (!session) {
        return NextResponse.json({ message: 'Session not found or expired' }, { status: 404 });
    }

    const output = session.buffer;
    session.buffer = ''; // Clear buffer after sending

    // Using btoa as a simple way to handle binary data in JSON
    return NextResponse.json({ output: btoa(output) });
}

// POST request handler for sending input
export async function POST(request: NextRequest, { params }: { params: { sessionId: string } }) {
    const sessionId = params.sessionId;
    const session = sessions.get(sessionId);

    if (!session) {
        return NextResponse.json({ message: 'Session not found or expired' }, { status: 404 });
    }
    
    const { input } = await request.json();
    if (typeof input !== 'string') {
        return NextResponse.json({ message: 'Input must be a string' }, { status: 400 });
    }

    try {
        const inputBuffer = Buffer.from(input, 'base64');
        session.stream.write(inputBuffer);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(`Error writing to stream for session ${sessionId}:`, error);
        return NextResponse.json({ message: 'Failed to write to stream' }, { status: 500 });
    }
}
