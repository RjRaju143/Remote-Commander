
"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Server } from "@/lib/types";
import { HardDrive, MoreVertical, PlusCircle, Wifi, WifiOff, Edit, Trash2, Terminal, Loader2, Users, User, Share2, Cpu, MemoryStick, Database, RefreshCcw } from "lucide-react";
import { AddServerDialog } from "./add-server-dialog";
import { useEffect, useState } from "react";
import { getServers, deleteServer, getCurrentUser } from "@/lib/actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EditServerDialog } from "./edit-server-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShareDialog } from "./share-dialog";
import type { User as CurrentUser } from "@/models/User";
import { Progress } from "@/components/ui/progress";
import { getServerHealth, type GetServerHealthOutput } from "@/ai/flows/get-server-health";


type ServerWithHealth = Server & { 
    health?: GetServerHealthOutput;
    isCheckingHealth?: boolean;
};

function HealthStatus({ health, isChecking, onRefresh }: { health?: GetServerHealthOutput, isChecking?: boolean, onRefresh: () => void }) {
    if (!health && !isChecking) {
        return (
            <Button variant="outline" size="sm" onClick={onRefresh}>
                <RefreshCcw className="mr-2" /> Check Health
            </Button>
        );
    }
    
    return (
        <div className="space-y-3">
             <div className="flex justify-between items-center mb-2">
                 <h4 className="text-sm font-medium">Server Health</h4>
                 <Button variant="ghost" size="icon" onClick={onRefresh} disabled={isChecking}>
                    <RefreshCcw className={isChecking ? "animate-spin" : ""} />
                 </Button>
            </div>
            {isChecking && !health ? (
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Loader2 className="animate-spin" />
                        <span className="text-sm text-muted-foreground">Fetching metrics...</span>
                    </div>
                    <Progress value={0} className="h-2"/>
                    <Progress value={0} className="h-2"/>
                    <Progress value={0} className="h-2"/>
                </div>
            ) : health && (
                 <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2">
                        <Cpu className="text-primary"/>
                        <span className="w-16">CPU</span>
                        <Progress value={health.cpuUsage} className="h-2"/>
                        <span className="w-10 text-right font-mono">{health.cpuUsage.toFixed(0)}%</span>
                    </div>
                     <div className="flex items-center gap-2">
                        <MemoryStick className="text-primary"/>
                        <span className="w-16">Memory</span>
                        <Progress value={health.memoryUsage} className="h-2"/>
                        <span className="w-10 text-right font-mono">{health.memoryUsage.toFixed(0)}%</span>
                    </div>
                     <div className="flex items-center gap-2">
                        <Database className="text-primary"/>
                        <span className="w-16">Disk</span>
                        <Progress value={health.diskUsage} className="h-2"/>
                        <span className="w-10 text-right font-mono">{health.diskUsage.toFixed(0)}%</span>
                    </div>
                </div>
            )}
        </div>
    );
}

export function ServerList() {
  const [servers, setServers] = useState<ServerWithHealth[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<Server | null>(null);
  const [sharingServer, setSharingServer] = useState<Server | null>(null);
  const [deletingServerId, setDeletingServerId] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  const fetchServers = async () => {
    const [dbServers, user] = await Promise.all([getServers(), getCurrentUser()]);
    const formattedServers = dbServers.map((s: any) => ({ ...s, id: s._id.toString(), status: s.status || 'inactive' }));
    setServers(formattedServers);
    setCurrentUser(user);
  };

  useEffect(() => {
    fetchServers();
  }, []); 

  const handleCheckHealth = async (serverId: string) => {
    setServers(prev => prev.map(s => s.id === serverId ? { ...s, isCheckingHealth: true } : s));
    try {
        const health = await getServerHealth({ serverId });
        setServers(prev => prev.map(s => s.id === serverId ? { ...s, health, isCheckingHealth: false } : s));
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Health Check Failed",
            description: error.message || "Could not retrieve server health.",
        });
        setServers(prev => prev.map(s => s.id === serverId ? { ...s, isCheckingHealth: false } : s));
    }
  };

  const handleDelete = async () => {
    if (!deletingServerId) return;
    const result = await deleteServer(deletingServerId);
    if (result.error) {
      toast({ variant: "destructive", title: "Error", description: result.error });
    } else {
      toast({ title: "Success", description: "Server deleted successfully." });
      fetchServers(); // Re-fetch servers
    }
    setDeletingServerId(null);
  };

  const handleConnect = (serverId: string) => {
    setServers(currentServers => 
      currentServers.map(s => 
        s.id === serverId ? { ...s, status: 'connecting' } : s
      )
    );
    router.push(`/dashboard/server/${serverId}`);
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold font-headline">Your Servers</h2>
        <AddServerDialog 
          open={isAddDialogOpen} 
          onOpenChange={(isOpen) => {
            setAddDialogOpen(isOpen);
            if (!isOpen) fetchServers();
          }}
        >
          <Button>
            <PlusCircle />
            Add Server
          </Button>
        </AddServerDialog>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {servers.map((server) => {
          const isOwner = server.ownerId === currentUser?._id;

          return (
          <Card key={server.id} className="flex flex-col">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="font-headline">{server.name}</CardTitle>
                  <CardDescription>{server.ip}:{server.port}</CardDescription>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" disabled={server.status === 'connecting'}>
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {isOwner ? (
                      <>
                        <DropdownMenuItem onSelect={() => setEditingServer(server)}>
                          <Edit className="mr-2 h-4 w-4" />
                          <span>Edit</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setSharingServer(server)}>
                          <Users className="mr-2 h-4 w-4" />
                          <span>Share</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setDeletingServerId(server.id!)} className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" />
                          <span>Delete</span>
                        </DropdownMenuItem>
                      </>
                    ) : (
                       <DropdownMenuItem disabled>
                         <User className="mr-2 h-4 w-4" />
                         <span>Guest Access</span>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="flex-grow space-y-4">
               {!isOwner && server.owner && (
                <div className="flex items-center text-sm text-muted-foreground mb-4">
                  <Share2 className="mr-2 h-4 w-4" />
                  <span>Shared by: {server.owner.email}</span>
                </div>
              )}
              <HealthStatus 
                health={server.health}
                isChecking={server.isCheckingHealth}
                onRefresh={() => handleCheckHealth(server.id!)}
              />
            </CardContent>
            <CardFooter>
               <Button className="w-full" onClick={() => handleConnect(server.id!)} disabled={server.status === 'connecting'}>
                  {server.status === 'connecting' ? <Loader2 className="animate-spin" /> : <Terminal />}
                  {server.status === 'connecting' ? 'Connecting...' : 'Connect'}
                </Button>
            </CardFooter>
          </Card>
        )})}
         {servers.length === 0 && (
          <Card className="md:col-span-3 flex flex-col items-center justify-center p-8 text-center">
            <CardHeader>
              <CardTitle>No Servers Found</CardTitle>
              <CardDescription>
                You haven't added any servers yet. Click the button above to get started.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <HardDrive className="size-16 text-muted-foreground" />
            </CardContent>
          </Card>
        )}
      </div>

       {editingServer && (
        <EditServerDialog
          server={editingServer}
          currentUser={currentUser}
          open={!!editingServer}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setEditingServer(null);
              fetchServers();
            }
          }}
        />
      )}

      {sharingServer && (
        <ShareDialog
            server={sharingServer}
            open={!!sharingServer}
            onOpenChange={(isOpen) => {
                if (!isOpen) {
                    setSharingServer(null);
                }
            }}
        />
       )}
      
      <AlertDialog open={!!deletingServerId} onOpenChange={(isOpen) => !isOpen && setDeletingServerId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the server credentials. Only the original owner can do this.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
