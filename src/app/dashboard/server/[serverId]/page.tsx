'use client';

import { getServerById, testServerConnection, getCurrentUser } from '@/lib/actions';
import { notFound, useRouter, useParams } from 'next/navigation';
import { ShellClientWrapper } from '@/components/dashboard/shell-client-wrapper';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, ServerCrash, Wifi, Maximize, Minimize, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState, useRef } from 'react';
import type { Server } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CommandClassifier } from '@/components/dashboard/command-classifier';
import { Separator } from '@/components/ui/separator';
import { ServerMetrics } from '@/components/dashboard/server-metrics';
import { cn } from '@/lib/utils';
import { canUser } from '@/lib/auth';
import type { User } from '@/models/User';
import { Permission } from '@/lib/types';


type ConnectionStatus = 'connecting' | 'connected' | 'error';

export default function ServerShellPage() {
    const params = useParams();
    const serverId = params.serverId as string;
    const [server, setServer] = useState<Server | null>(null);
    const [status, setStatus] = useState<ConnectionStatus>('connecting');
    const [error, setError] = useState<string | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const shellContainerRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [hasExecutePermission, setHasExecutePermission] = useState(false);

    useEffect(() => {
        if (!serverId) return;

        const fetchServerAndTestConnection = async () => {
            const [serverData, user] = await Promise.all([
                getServerById(serverId),
                getCurrentUser()
            ]);
            
            if (!serverData || !user) {
                notFound();
                return;
            }

            setCurrentUser(user);
            setServer(serverData);
            
            const permission = await canUser(serverData, Permission.EXECUTE, user);
            setHasExecutePermission(permission);

            if (!permission) {
                setStatus('error');
                setError('You do not have permission to connect to this server.');
                return;
            }

            const result = await testServerConnection(serverId);
            if (result.success) {
                setStatus('connected');
            } else {
                setStatus('error');
                setError(result.error || 'An unknown connection error occurred.');
            }
        };

        fetchServerAndTestConnection();
    }, [serverId]);

    const handleFullscreenToggle = () => {
        const elem = shellContainerRef.current;
        if (!elem) return;

        if (!document.fullscreenElement) {
            elem.requestFullscreen().catch(err => {
                alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
        } else {
            document.exitFullscreen();
        }
    };

    useEffect(() => {
        const onFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', onFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
    }, []);

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
                 const Icon = hasExecutePermission ? ServerCrash : ShieldAlert;
                 return (
                     <Card className="max-w-md mx-auto">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Icon className="text-destructive" />
                                {hasExecutePermission ? 'Connection Failed' : 'Access Denied'}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="mb-4">{error}</p>
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
                    <div className={cn("flex-1 min-h-0 grid md:grid-cols-3 gap-4", isFullscreen && "grid-cols-1 grid-rows-1")}>
                        <div ref={shellContainerRef} className={cn("md:col-span-2 min-h-[400px] flex flex-col relative bg-card rounded-lg overflow-hidden", isFullscreen && "col-span-1")}>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute top-2 right-2 z-10 text-white/50 hover:text-white hover:bg-white/10"
                                onClick={handleFullscreenToggle}
                                title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                            >
                                {isFullscreen ? <Minimize /> : <Maximize />}
                            </Button>
                           <ShellClientWrapper serverId={serverId} username={server.username} />
                        </div>
                        <div className={cn("space-y-4", isFullscreen && "hidden")}>
                            <ServerMetrics serverId={serverId} />
                            <Separator />
                            <CommandClassifier />
                        </div>
                    </div>
                 );
        }
    }


    return (
        <div className="flex flex-col h-[calc(100vh-8rem)] gap-4">
           {server && (
             <header className={cn("flex items-center justify-between", isFullscreen && "hidden")}>
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
