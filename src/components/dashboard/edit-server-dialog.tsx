
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
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useState } from "react";
import { updateServer, getServerPrivateKey, getCurrentUser } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";
import type { Server } from "@/lib/types";
import { Download, Loader2 } from "lucide-react";
import type { User } from "@/models/User";


type EditServerDialogProps = {
  server: Server;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUser: User | null;
};

export function EditServerDialog({ server, open, onOpenChange, currentUser }: EditServerDialogProps) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [ip, setIp] = useState('');
  const [port, setPort] = useState(22);
  const [username, setUsername] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [isOwner, setIsOwner] = useState(false);


  useEffect(() => {
    if (server && currentUser) {
      setName(server.name);
      setIp(server.ip);
      setPort(Number(server.port));
      setUsername(server.username);
      setPrivateKey(''); // Do not display existing key for security
      setIsOwner(server.ownerId === currentUser._id);
    }
  }, [server, currentUser]);
  
  const handleSubmit = async () => {
    if (!server.id) return;
    
    const serverData: any = { name, ip, port, username };
    // Only include private key if it's been changed
    if (privateKey) {
        serverData.privateKey = privateKey;
    }

    const result = await updateServer(server.id, serverData);

    if (result.error) {
      toast({
        variant: "destructive",
        title: "Error updating server",
        description: result.error,
      });
    } else {
      toast({
        title: "Server Updated",
        description: `${name} has been updated successfully.`,
      });
      onOpenChange(false);
    }
  };

  const handleDownloadKey = async () => {
    if (!server.id) return;
    setIsDownloading(true);

    const result = await getServerPrivateKey(server.id);
    setIsDownloading(false);

    if (result.error) {
        toast({
            variant: "destructive",
            title: "Download Failed",
            description: result.error,
        });
    } else if (result.privateKey) {
        const blob = new Blob([result.privateKey], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${server.name.replace(/\s+/g, '_').toLowerCase()}_private_key.key`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast({
            title: "Key Downloaded",
            description: "The private key has been downloaded.",
        });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-headline">Edit Server</DialogTitle>
          <DialogDescription>
            Update the credentials for {server.name}. The private key is not shown for security.
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
            <Label htmlFor="privateKey" className="text-right pt-2">New Private Key</Label>
            <Textarea id="privateKey" value={privateKey} onChange={(e) => setPrivateKey(e.target.value)} className="col-span-3 font-code" placeholder="Leave blank to keep existing key" />
          </div>
        </div>
        <DialogFooter className="justify-between">
           {isOwner && (
            <Button variant="outline" onClick={handleDownloadKey} disabled={isDownloading}>
                {isDownloading ? <Loader2 className="animate-spin" /> : <Download />}
                Download Key
            </Button>
           )}
           <div/>
          <Button type="submit" onClick={handleSubmit}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
