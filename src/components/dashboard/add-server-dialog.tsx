
"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState, type ReactNode, useActionState, useEffect, useRef } from "react";
import { addServer } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";


type AddServerDialogProps = {
  children: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AddServerDialog({ children, open, onOpenChange }: AddServerDialogProps) {
  const { toast, notify } = useToast();
  const [state, formAction, pending] = useActionState(addServer, undefined);
  const onOpenChangeRef = useRef(onOpenChange);
  const prevStateRef = useRef(state);


  useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  });

  useEffect(() => {
     // Only trigger effects if the state has genuinely changed
    if (state !== prevStateRef.current) {
        if (state?.error) {
          toast({
            variant: "destructive",
            title: "Error adding server",
            description: state.error,
          });
        }
        if (state?.success) {
          toast({
            title: "Server Added",
            description: "A new server has been added successfully.",
          });
          if (state.notification) {
              notify();
          }
          onOpenChangeRef.current(false);
          const form = document.getElementById('addServerForm') as HTMLFormElement;
          form?.reset();
        }
        prevStateRef.current = state;
    }
  }, [state, toast, notify]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form action={formAction} id="addServerForm">
            <DialogHeader>
            <DialogTitle className="font-headline">Add New Server</DialogTitle>
            <DialogDescription>
                Enter the credentials for the server you want to manage. The private key will be encrypted.
            </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Name</Label>
                <Input id="name" name="name" className="col-span-3" placeholder="My Awesome Server" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="ip" className="text-right">IP Address</Label>
                <Input id="ip" name="ip" className="col-span-3" placeholder="192.168.1.1" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="port" className="text-right">Port</Label>
                <Input id="port" name="port" type="number" defaultValue={22} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="username" className="text-right">Username</Label>
                <Input id="username" name="username" className="col-span-3" placeholder="root" required />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="privateKey" className="text-right pt-2">Private Key</Label>
                <Textarea id="privateKey" name="privateKey" className="col-span-3 font-code" placeholder="-----BEGIN RSA PRIVATE KEY-----" />
            </div>
            </div>
            <DialogFooter>
                <Button type="submit" disabled={pending}>
                    {pending && <Loader2 className="animate-spin" />}
                    Save Server
                </Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
