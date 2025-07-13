
'use client';

import { getServerById, testServerConnection } from '@/lib/actions';
import { notFound, useRouter } from 'next/navigation';
import { ShellClientWrapper } from '@/components/dashboard/shell-client-wrapper';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, ServerCrash, Wifi } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState } from 'react';
import type { Server } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type ConnectionStatus = 'connecting' | 'connected' | 'error';

export default function ServerShellPage({ params }: { params: { serverId: string } }) {
    const [server, setServer] = useState<Server | null>(null);
    const [status, setStatus] = useState<ConnectionStatus>('connecting');
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        const fetchServerAndTestConnection = async () => {
            const serverData = await getServerById(params.serverId);
            if (!serverData) {
                // This will trigger the notFound UI
                notFound();
                return;
            }
            setServer(serverData);

            const result = await testServerConnection(params.serverId);
            if (result.success) {
                setStatus('connected');
            } else {
                setStatus('error');
                setError(result.error || 'An unknown connection error occurred.');
            }
        };

        fetchServerAndTestConnection();
    }, [params.serverId]);

    const renderContent = () => {
        switch (status) {
            case 'connecting':
                return (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <Loader2 className="h-12 w-12 animate-spin mb-4" />
                        <p className="text-xl">Connecting to {server?.name || 'server'}...</p>
                        <p>Verifying credentials and server availability.</p>
                    </div>
                );
            case 'error':
                return (
                     <Card className="max-w-md mx-auto">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <ServerCrash className="text-destructive" />
                                Connection Failed
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="mb-4">Could not connect to the server. Please check the credentials and ensure the server is online.</p>
                            <p className="text-sm bg-muted text-destructive p-2 rounded-md font-code">{error}</p>
                            <Button onClick={() => router.back()} className="mt-6 w-full">
                                <ArrowLeft />
                                Go Back
                            </Button>
                        </CardContent>
                    </Card>
                );
            case 'connected':
                 if (!server) return null;
                 return (
                    <div className="flex-1 min-h-0">
                        <ShellClientWrapper serverId={params.serverId} username={server.username} />
                    </div>
                 );
        }
    }


    return (
        <div className="flex flex-col h-[calc(100vh-8rem)] gap-4">
           {server && (
             <header className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold font-headline tracking-tight">{server.name}</h1>
                         <Badge className={status === 'connected' ? "bg-accent text-accent-foreground hover:bg-accent/90" : "bg-secondary"}>
                            {status === 'connecting' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {status === 'connected' && <Wifi className="mr-2 h-4 w-4" />}
                            {status === 'error' && <ServerCrash className="mr-2 h-4 w-4" />}
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                        </Badge>
                    </div>
                    <p className="text-muted-foreground">
                        {server.username}@{server.ip}
                    </p>
                </div>
                <Button asChild variant="outline">
                    <Link href="/dashboard">
                        <ArrowLeft />
                        Back to Servers
                    </Link>
                </Button>
            </header>
           )}
            {renderContent()}
        </div>
    );
}

