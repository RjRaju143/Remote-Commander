
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useActionState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Server } from "@/lib/types";
import { shareServer } from "@/lib/actions";
import { Loader2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Permission } from "@/lib/auth";

type ShareDialogProps = {
  server: Server;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ShareDialog({ server, open, onOpenChange }: ShareDialogProps) {
  const { toast, notify } = useToast();
  const [state, formAction, pending] = useActionState(shareServer, undefined);

   useEffect(() => {
    if (state?.error) {
        toast({
            variant: "destructive",
            title: "Error",
            description: state.error,
        });
    }
    if (state?.success) {
        toast({
            title: "Access Granted",
            description: state.message,
        });
        if (state.notification) {
            notify();
        }
        onOpenChange(false);
    }
   }, [state, toast, notify, onOpenChange]);


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline">Share "{server.name}"</DialogTitle>
          <DialogDescription>
            Grant another user access to this server by providing their email and selecting a permission level.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction}>
            <input type="hidden" name="serverId" value={server.id} />
            <div className="grid gap-6 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="email" className="text-right">
                    Email
                    </Label>
                    <Input
                        id="email"
                        name="email"
                        type="email"
                        className="col-span-3"
                        placeholder="user@example.com"
                        required
                    />
                </div>
                <div className="grid grid-cols-4 items-start gap-4">
                     <Label className="text-right pt-1">Permission</Label>
                     <RadioGroup name="permission" defaultValue={Permission.EXECUTE} className="col-span-3 space-y-3">
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
                         <div>
                            <RadioGroupItem value={Permission.ADMIN} id="admin" />
                             <Label htmlFor="admin" className="font-normal ml-2">Admin</Label>
                             <p className="text-xs text-muted-foreground ml-6">Can edit, delete, and share the server.</p>
                        </div>
                     </RadioGroup>
                </div>
            </div>
            <DialogFooter>
                <Button type="submit" disabled={pending}>
                    {pending && <Loader2 className="animate-spin" />}
                    Grant Access
                </Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
