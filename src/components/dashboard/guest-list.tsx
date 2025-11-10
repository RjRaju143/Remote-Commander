
"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Server, Trash2, Clock } from "lucide-react";
import { revokeInvitation } from "@/lib/invitations";
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
import { Badge } from "../ui/badge";
import { getPermissionBadgeVariant } from "@/lib/utils";
import type { InvitationWithDetails } from "@/lib/invitations";
import { formatDistanceToNow } from "date-fns";


type RevokeInfo = {
  invitationId: string;
  guestEmail: string;
  serverName: string;
};

export function GuestList({ initialInvitations }: {initialInvitations: InvitationWithDetails[]}) {
  const [invitations, setInvitations] = useState(initialInvitations);
  const [revokeInfo, setRevokeInfo] = useState<RevokeInfo | null>(null);
  const { toast } = useToast();

  const handleRevokeClick = (
    invitationId: string,
    guestEmail: string,
    serverName: string
  ) => {
    setRevokeInfo({ invitationId, guestEmail, serverName });
  };

  const handleRevokeConfirm = async () => {
    if (!revokeInfo) return;

    const result = await revokeInvitation(revokeInfo.invitationId);

    if (result.error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: result.error,
      });
    } else {
      toast({
        title: "Access Revoked",
        description: `Invitation for ${revokeInfo.guestEmail} to ${revokeInfo.serverName} has been revoked.`,
      });
      // Refresh the list optimistically
      setInvitations((currentInvitations) =>
        currentInvitations.filter(
          (inv) => inv._id.toString() !== revokeInfo.invitationId
        )
      );
    }
    setRevokeInfo(null);
  };

  const groupedByEmail = invitations.reduce((acc, inv) => {
    const email = inv.email;
    if (!acc[email]) {
      acc[email] = [];
    }
    acc[email].push(inv);
    return acc;
  }, {} as Record<string, InvitationWithDetails[]>);


  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Object.entries(groupedByEmail).map(([email, userInvitations]) => (
        <Card key={email}>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar>
                <AvatarFallback>
                  {email.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="font-headline text-lg">
                  {email}
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
              {userInvitations.map((inv) => (
                <li
                  key={inv._id.toString()}
                  className="flex items-center justify-between text-sm p-2 rounded-md hover:bg-muted/50"
                >
                  <div className="flex flex-col gap-1">
                     <div className="flex items-center gap-2">
                        <Server className="text-muted-foreground size-4" />
                        <span>{inv.server.name}</span>
                    </div>
                     <div className="flex items-center gap-2">
                        <Badge variant={getPermissionBadgeVariant(inv.permission)} className="w-fit">
                            {inv.permission}
                        </Badge>
                         {inv.status === 'pending' && (
                            <Badge variant="outline" className="w-fit">
                                <Clock className="mr-1 h-3 w-3" />
                                Pending
                            </Badge>
                         )}
                     </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() =>
                      handleRevokeClick(
                        inv._id.toString(),
                        inv.email,
                        inv.server.name
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
              This will revoke the invitation for{" "}
              <span className="font-bold">{revokeInfo?.guestEmail}</span>
              {' '}to access the server{" "}
              <span className="font-bold">{revokeInfo?.serverName}</span>. If they have already accepted, their access will be removed.
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
