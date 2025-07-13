
"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Server, Trash2, User } from "lucide-react";
import { type GuestAccessDetails, revokeGuestAccess } from "@/lib/actions";
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

type GuestListProps = {
  initialGuestDetails: GuestAccessDetails;
};

type RevokeInfo = {
  serverId: string;
  guestId: string;
  guestEmail: string;
  serverName: string;
};

export function GuestList({ initialGuestDetails }: GuestListProps) {
  const [guestDetails, setGuestDetails] = useState(initialGuestDetails);
  const [revokeInfo, setRevokeInfo] = useState<RevokeInfo | null>(null);
  const { toast } = useToast();

  const handleRevokeClick = (
    serverId: string,
    guestId: string,
    guestEmail: string,
    serverName: string
  ) => {
    setRevokeInfo({ serverId, guestId, guestEmail, serverName });
  };

  const handleRevokeConfirm = async () => {
    if (!revokeInfo) return;

    const result = await revokeGuestAccess(
      revokeInfo.serverId,
      revokeInfo.guestId
    );

    if (result.error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: result.error,
      });
    } else {
      toast({
        title: "Access Revoked",
        description: `Access for ${revokeInfo.guestEmail} to ${revokeInfo.serverName} has been revoked.`,
      });
      // Refresh the list optimistically
      setGuestDetails((currentDetails) =>
        currentDetails
          .map((guest) => ({
            ...guest,
            servers: guest.servers.filter(
              (server) =>
                !(
                  server.serverId === revokeInfo.serverId &&
                  guest.guestId === revokeInfo.guestId
                )
            ),
          }))
          .filter((guest) => guest.servers.length > 0)
      );
    }
    setRevokeInfo(null);
  };

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {guestDetails.map((guest) => (
        <Card key={guest.guestId}>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar>
                <AvatarFallback>
                  {guest.guestEmail.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="font-headline text-lg">
                  {guest.guestEmail}
                </CardTitle>
                <CardDescription>
                  Guest User
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <h4 className="mb-2 font-semibold text-sm">Server Access:</h4>
            <ul className="space-y-2">
              {guest.servers.map((server) => (
                <li
                  key={server.serverId}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <Server className="text-muted-foreground" />
                    <span>{server.serverName}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() =>
                      handleRevokeClick(
                        server.serverId,
                        guest.guestId,
                        guest.guestEmail,
                        server.serverName
                      )
                    }
                  >
                    <Trash2 className="mr-2" />
                    Revoke
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}

      <AlertDialog
        open={!!revokeInfo}
        onOpenChange={(isOpen) => !isOpen && setRevokeInfo(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will revoke{" "}
              <span className="font-bold">{revokeInfo?.guestEmail}</span>'s
              access to the server{" "}
              <span className="font-bold">{revokeInfo?.serverName}</span>. They
              will no longer be able to connect to it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevokeConfirm}
              className="bg-destructive hover:bg-destructive/90"
            >
              Confirm Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
