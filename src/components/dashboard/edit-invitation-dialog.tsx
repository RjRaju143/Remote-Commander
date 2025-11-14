
"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useEffect, useRef, useActionState } from "react";
import { useToast } from "@/hooks/use-toast";
import { updateInvitationPermission } from "@/lib/invitations";
import type { InvitationWithDetails } from "@/lib/invitations";
import { Loader2, Save } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Permission } from "@/lib/types";

type EditInvitationDialogProps = {
  invitation: InvitationWithDetails;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function EditInvitationDialog({ invitation, open, onOpenChange }: EditInvitationDialogProps) {
  const { toast } = useToast();
  const [state, formAction, pending] = useActionState(updateInvitationPermission, undefined);
  const onOpenChangeRef = useRef(onOpenChange);
  const prevStateRef = useRef(state);

  useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  });

  useEffect(() => {
    if (state !== prevStateRef.current) {
        if (state?.error) {
            toast({
                variant: "destructive",
                title: "Error Updating Permission",
                description: state.error,
            });
        }
        if (state?.success) {
            toast({
                title: "Permission Updated",
                description: `Permission for ${invitation.email} has been updated.`,
            });
            onOpenChangeRef.current(false);
        }
        prevStateRef.current = state;
    }
   }, [state, toast, invitation.email]);


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline">Edit Permission for {invitation.email}</DialogTitle>
          <DialogDescription>
            Update the permission level for access to the server "{invitation.server.name}".
          </DialogDescription>
        </DialogHeader>
        <form action={formAction}>
            <input type="hidden" name="invitationId" value={invitation._id.toString()} />
            <div className="grid gap-6 py-4">
                <div className="grid grid-cols-4 items-start gap-4">
                     <Label className="text-right pt-1">Permission</Label>
                     <RadioGroup name="permission" defaultValue={invitation.permission} className="col-span-3 space-y-3">
                        <div>
                            <RadioGroupItem value={Permission.READ} id="read" />
                            <Label htmlFor="read" className="font-normal ml-2">Read</Label>
                            <p className="text-xs text-muted-foreground ml-6">Can view server details but cannot connect.</p>
                        </div>
                        <div>
                            <RadioGroupItem value={Permission.EXECUTE} id="execute" />
                             <Label htmlFor="execute" className="font-normal ml-2">Execute</Label>
                             <p className="text-xs text-muted-foreground ml-6">Can connect to the server and run commands.</p>
                        </div>
                     </RadioGroup>
                </div>
            </div>
            {state?.error && <p className="text-destructive text-sm mb-4 px-1">{state.error}</p>}
            <DialogFooter>
                <Button type="submit" disabled={pending}>
                    {pending ? <Loader2 className="animate-spin" /> : <Save />}
                    Save Changes
                </Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
