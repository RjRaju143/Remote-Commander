
"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Server } from "@/lib/types";
import { HardDrive, MoreVertical, PlusCircle, Wifi, WifiOff, Edit, Trash2, Terminal, Loader2, Users, User, Share2 } from "lucide-react";
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


export function ServerList() {
  const [servers, setServers] = useState<Server[]>([]);
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

  const getStatusContent = (server: Server) => {
    switch(server.status) {
      case 'connecting':
        return { 
          badgeVariant: 'secondary',
          icon: <Loader2 className="mr-2 animate-spin" />, 
          text: 'Connecting'
        };
      case 'active': // This status is not currently used, but here for future use
         return { 
          badgeVariant: 'default',
          badgeClass: 'bg-accent text-accent-foreground',
          icon: <Wifi className="mr-2" />, 
          text: 'Active'
        };
      case 'inactive':
      default:
         return { 
          badgeVariant: 'secondary',
          icon: <WifiOff className="mr-2" />, 
          text: 'Inactive'
        };
    }
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
                <div className="flex items-center text-sm text-muted-foreground">
                  <Share2 className="mr-2 h-4 w-4" />
                  <span>Shared by: {server.owner.email}</span>
                </div>
              )}
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
