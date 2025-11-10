

'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Server } from "@/lib/types";
import { HardDrive, MoreVertical, PlusCircle, Wifi, WifiOff, Edit, Trash2, Terminal, Loader2, Users, User, Share2, Cpu, MemoryStick, Database, RefreshCcw, Star, Eye } from "lucide-react";
import { AddServerDialog } from "./add-server-dialog";
import { useEffect, useState, useCallback, useTransition, useRef } from "react";
import { getServers, deleteServer, toggleFavoriteServer, getFavoriteServers, getCurrentUser } from "@/lib/actions";
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
import { cn } from "@/lib/utils";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { canUser, Permission } from "@/lib/auth";


type ServerWithHealth = Server & { 
    isCheckingHealth?: boolean;
};

const SERVERS_PER_PAGE = 6;


export function ServerList({ showOnlyFavorites = false }: { showOnlyFavorites?: boolean }) {
  const [servers, setServers] = useState<ServerWithHealth[]>([]);
  const [totalServers, setTotalServers] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<Server | null>(null);
  const [sharingServer, setSharingServer] = useState<Server | null>(null);
  const [deletingServerId, setDeletingServerId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast, notify } = useToast();
  const router = useRouter();

  const totalPages = Math.ceil(totalServers / SERVERS_PER_PAGE);

  const fetchServersAndUser = useCallback(async () => {
    const user = await getCurrentUser();
    setCurrentUser(user);

    if (!user) return;

    let serversResponse;
    if (showOnlyFavorites) {
        serversResponse = await getFavoriteServers({ page: currentPage, limit: SERVERS_PER_PAGE });
    } else {
        serversResponse = await getServers({ page: currentPage, limit: SERVERS_PER_PAGE });
    }
    
    // Enrich server data with permissions for the current user
    const formattedServers = await Promise.all(serversResponse.servers.map(async (s: any) => {
        let userPermission = Permission.NONE;
        if (s.ownerId === user._id) {
            userPermission = Permission.ADMIN;
        } else {
             userPermission = await canUser(s, Permission.READ, user) ? Permission.READ : Permission.NONE;
             if (await canUser(s, Permission.EXECUTE, user)) userPermission = Permission.EXECUTE;
             if (await canUser(s, Permission.ADMIN, user)) userPermission = Permission.ADMIN;
        }

        return { 
            ...s, 
            id: s._id.toString(), 
            status: s.status || 'inactive',
            userPermission: userPermission,
        }
    }));

    setServers(formattedServers);
    setTotalServers(serversResponse.total);
  }, [currentPage, showOnlyFavorites]);

  useEffect(() => {
    fetchServersAndUser();
  }, [fetchServersAndUser]);

  useEffect(() => {
    setCurrentPage(1);
  }, [showOnlyFavorites]);


  const handleToggleFavorite = (serverId: string) => {
      const isCurrentlyFavorite = currentUser?.favorites?.includes(serverId);
      const originalFavorites = currentUser?.favorites;
      
      // Optimistic UI update
      setCurrentUser(prevUser => {
        if (!prevUser) return null;
        const newFavorites = isCurrentlyFavorite
            ? prevUser.favorites?.filter(id => id !== serverId)
            : [...(prevUser.favorites || []), serverId];
        return { ...prevUser, favorites: newFavorites };
      });
      
      startTransition(async () => {
        try {
            const result = await toggleFavoriteServer(serverId);
            if (result.notification) {
                notify();
            }
            if (showOnlyFavorites) {
              // If on favorites page, re-fetch to handle removal from list
              fetchServersAndUser();
            }
        } catch (e) {
            // Revert on error
            setCurrentUser(prevUser => {
                if (!prevUser) return null;
                return { ...prevUser, favorites: originalFavorites };
            });
            toast({ variant: "destructive", title: "Error", description: "Could not update favorites." });
        }
      });
  };

  const handleDelete = async () => {
    if (!deletingServerId) return;
    const result = await deleteServer(deletingServerId);
    if (result.error) {
      toast({ variant: "destructive", title: "Error", description: result.error });
    } else {
      toast({ title: "Success", description: "Server deleted successfully." });
      if (result.notification) {
          notify();
      }
      // Reset to page 1 and re-fetch, this handles removing last item on a page
       if (currentPage > 1 && servers.length === 1) {
            setCurrentPage(currentPage - 1);
        } else {
            fetchServersAndUser();
        }
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

  const handleAddServerOpenChange = useCallback((isOpen: boolean) => {
    setAddDialogOpen(isOpen);
    if (!isOpen) {
      fetchServersAndUser();
    }
  }, [fetchServersAndUser]);

  const handleEditServerOpenChange = useCallback((isOpen: boolean) => {
    setEditingServer(null);
    if (!isOpen) {
      fetchServersAndUser();
    }
  }, [fetchServersAndUser]);
  
  const handleShareServerOpenChange = useCallback((isOpen: boolean) => {
    setSharingServer(null);
    if (!isOpen) {
      fetchServersAndUser();
    }
  }, [fetchServersAndUser]);


  return (
    <section>
      {!showOnlyFavorites && (
         <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold font-headline">Your Servers</h2>
            <AddServerDialog 
            open={isAddDialogOpen} 
            onOpenChange={handleAddServerOpenChange}
            >
            <Button>
                <PlusCircle />
                Add Server
            </Button>
            </AddServerDialog>
        </div>
      )}
     
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {servers.map((server) => {
          const hasAdminAccess = server.userPermission === Permission.ADMIN;
          const hasExecuteAccess = server.userPermission === Permission.EXECUTE || hasAdminAccess;
          const isFavorite = currentUser?.favorites?.includes(server.id!);

          return (
          <Card key={server.id} className="flex flex-col">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-yellow-400 -ml-2"
                        onClick={() => handleToggleFavorite(server.id!)}
                        disabled={isPending}
                    >
                       <Star className={cn("size-5", isFavorite && "fill-yellow-400 text-yellow-400")} />
                    </Button>
                    <div>
                        <CardTitle className="font-headline">{server.name}</CardTitle>
                        <CardDescription>{server.ip}:{server.port}</CardDescription>
                    </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" disabled={server.status === 'connecting'}>
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {hasAdminAccess ? (
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
            <CardContent className="flex-grow">
               <div className="space-y-3 text-sm text-muted-foreground">
                    {!hasAdminAccess && server.owner && (
                        <div className="flex items-center gap-2">
                            <User className="text-primary"/>
                            <span>Shared by {server.owner.email}</span>
                        </div>
                    )}
                </div>
            </CardContent>
            <CardFooter>
               {hasExecuteAccess ? (
                    <Button className="w-full" onClick={() => handleConnect(server.id!)} disabled={server.status === 'connecting'}>
                        {server.status === 'connecting' ? <Loader2 className="animate-spin" /> : <Terminal />}
                        {server.status === 'connecting' ? 'Connecting...' : 'Connect'}
                    </Button>
               ) : (
                    <Button asChild className="w-full" variant="secondary">
                        <Link href={`/dashboard/server/${server.id!}`}>
                            <Eye /> View Details
                        </Link>
                    </Button>
               )}
            </CardFooter>
          </Card>
        )})}
         {servers.length === 0 && (
          <Card className="md:col-span-3 flex flex-col items-center justify-center p-8 text-center">
            <CardHeader>
              <CardTitle>{showOnlyFavorites ? "No Favorite Servers" : "No Servers Found"}</CardTitle>
              <CardDescription>
                {showOnlyFavorites ? "You haven't marked any servers as favorites yet. Click the star icon on a server to add it." : "You haven't added any servers yet. Click the 'Add Server' button to get started."}
              </CardDescription>
            </CardHeader>
            <CardContent>
                 {showOnlyFavorites ? <Star className="size-16 text-muted-foreground" /> : <HardDrive className="size-16 text-muted-foreground" />}
            </CardContent>
          </Card>
        )}
      </div>

       {totalPages > 1 && (
        <div className="mt-8">
            <Pagination>
                <PaginationContent>
                    <PaginationItem>
                        <PaginationPrevious 
                            href="#" 
                            onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.max(1, p - 1)); }}
                            className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                        />
                    </PaginationItem>
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <PaginationItem key={page}>
                            <PaginationLink 
                                href="#"
                                onClick={(e) => { e.preventDefault(); setCurrentPage(page); }}
                                isActive={currentPage === page}
                            >
                                {page}
                            </PaginationLink>
                        </PaginationItem>
                    ))}
                    
                    <PaginationItem>
                        <PaginationNext 
                            href="#" 
                            onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.min(totalPages, p + 1)); }}
                            className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                        />
                    </PaginationItem>
                </PaginationContent>
            </Pagination>
        </div>
      )}


       {editingServer && (
        <EditServerDialog
          server={editingServer}
          currentUser={currentUser}
          open={!!editingServer}
          onOpenChange={handleEditServerOpenChange}
        />
      )}

      {sharingServer && (
        <ShareDialog
            server={sharingServer}
            open={!!sharingServer}
            onOpenChange={handleShareServerOpenChange}
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

    
