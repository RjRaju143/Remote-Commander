
"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Trash2, Clock } from "lucide-react";
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


  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Sent Invitations</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Guest</TableHead>
                <TableHead>Server</TableHead>
                <TableHead>Permission</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Invited</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitations.map((inv) => (
                <TableRow key={inv._id.toString()}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="size-8">
                        <AvatarFallback>{inv.email.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{inv.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>{inv.server.name}</TableCell>
                  <TableCell>
                    <Badge variant={getPermissionBadgeVariant(inv.permission)}>{inv.permission}</Badge>
                  </TableCell>
                  <TableCell>
                    {inv.status === 'pending' ? (
                       <Badge variant="outline" className="w-fit">
                          <Clock className="mr-1 h-3 w-3" />
                          Pending
                       </Badge>
                    ) : (
                       <Badge variant="secondary">{inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDistanceToNow(new Date(inv.expiresAt), { addSuffix: true })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => handleRevokeClick(inv._id.toString(), inv.email, inv.server.name)}
                    >
                      <Trash2 className="size-4" />
                      <span className="sr-only">Revoke</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
               {invitations.length === 0 && (
                <TableRow>
                    <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                        No guests have been invited yet.
                    </TableCell>
                </TableRow>
               )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
    </>
  );
}
