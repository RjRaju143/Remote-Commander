
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
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Server } from "@/lib/types";
import { shareServer } from "@/lib/actions";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

type ShareDialogProps = {
  server: Server;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            Grant Access
        </Button>
    )
}

export function ShareDialog({ server, open, onOpenChange }: ShareDialogProps) {
  const { toast, notify } = useToast();
  const [email, setEmail] = useState("");

  const handleShareAction = async () => {
    if (!server.id) return;
    const result = await shareServer(server.id, email);
    if (result.error) {
        toast({
            variant: "destructive",
            title: "Error",
            description: result.error,
        });
    } else {
        toast({
            title: "Access Granted",
            description: `${email} now has access to ${server.name}.`,
        });
        if (result.notification) {
            notify();
        }
        onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-headline">Share "{server.name}"</DialogTitle>
          <DialogDescription>
            Enter the email of the user you want to grant access to this server. They will immediately be able to see and connect to it.
          </DialogDescription>
        </DialogHeader>
        <form action={handleShareAction}>
            <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">
                Email
                </Label>
                <Input
                    id="email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="col-span-3"
                    placeholder="user@example.com"
                    required
                />
            </div>
            </div>
            <DialogFooter>
                <SubmitButton />
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
