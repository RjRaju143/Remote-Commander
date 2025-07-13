
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
import { useState, type ReactNode } from "react";
import { addServer } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";


type AddServerDialogProps = {
  children: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AddServerDialog({ children, open, onOpenChange }: AddServerDialogProps) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [ip, setIp] = useState('');
  const [port, setPort] = useState(22);
  const [username, setUsername] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  
  const handleSubmit = async () => {
    const result = await addServer({ name, ip, port, username, privateKey });
    if (result.error) {
      toast({
        variant: "destructive",
        title: "Error adding server",
        description: result.error,
      });
    } else {
      toast({
        title: "Server Added",
        description: `${name} has been added successfully.`,
      });
       // Reset form and close dialog
      setName('');
      setIp('');
      setPort(22);
      setUsername('');
      setPrivateKey('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-headline">Add New Server</DialogTitle>
          <DialogDescription>
            Enter the credentials for the server you want to manage. The private key will be encrypted.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" placeholder="My Awesome Server" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="ip" className="text-right">IP Address</Label>
            <Input id="ip" value={ip} onChange={(e) => setIp(e.target.value)} className="col-span-3" placeholder="192.168.1.1" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="port" className="text-right">Port</Label>
            <Input id="port" type="number" value={port} onChange={(e) => setPort(parseInt(e.target.value, 10))} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="username" className="text-right">Username</Label>
            <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} className="col-span-3" placeholder="root" />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="privateKey" className="text-right pt-2">Private Key</Label>
            <Textarea id="privateKey" value={privateKey} onChange={(e) => setPrivateKey(e.target.value)} className="col-span-3 font-code" placeholder="-----BEGIN RSA PRIVATE KEY-----" />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleSubmit}>Save Server</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
