
"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Bell, Check, Server, ShieldCheck, LifeBuoy, Trash2, Loader2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  deleteAllNotifications,
} from "@/lib/actions";
import { type Notification } from "@/models/Notification";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from 'date-fns';
import { cn } from "@/lib/utils";
import { Skeleton } from "../ui/skeleton";
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
import { useToast } from "@/hooks/use-toast";


function NotificationIcon({ type }: { type: string }) {
    switch (type) {
        case "server_added":
        case "server_shared":
        case "server_favorite":
            return <Server className="size-5 text-primary" />;
        case "password_changed":
            return <ShieldCheck className="size-5 text-destructive" />;
        case "support_request":
            return <LifeBuoy className="size-5 text-accent" />;
        default:
            return <Bell className="size-5 text-muted-foreground" />;
    }
}


export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const { toast, lastNotificationTimestamp } = useToast();

  const fetchNotifications = async () => {
    setIsLoading(true);
    const data = await getNotifications();
    setNotifications(data.notifications);
    setUnreadCount(data.unreadCount);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    if (lastNotificationTimestamp) {
        fetchNotifications();
    }
  }, [lastNotificationTimestamp]);


  const handleMarkAsRead = (id: string) => {
    startTransition(async () => {
        const isAlreadyRead = notifications.find(n => n._id === id)?.isRead;
        if (!isAlreadyRead) {
            setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        }
        await markNotificationAsRead(id);
    });
  };

  const handleMarkAllAsRead = () => {
    startTransition(async () => {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
        await markAllNotificationsAsRead();
    });
  };
  
  const handleClearAll = () => {
    startTransition(async () => {
      setShowClearConfirm(false);
      const result = await deleteAllNotifications();
      if (result.error) {
        toast({
          variant: 'destructive',
          title: "Error",
          description: result.error
        });
        fetchNotifications(); // Re-fetch on error to restore state
      } else {
         toast({
          title: "Notifications Cleared",
          description: "Your notification list has been cleared.",
        });
        setNotifications([]);
        setUnreadCount(0);
      }
    });
  };


  return (
    <>
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 transform translate-x-1/2 -translate-y-1/2 bg-destructive rounded-full">
              {unreadCount}
            </span>
          )}
          <span className="sr-only">Toggle notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-semibold">Notifications</h3>
            {unreadCount > 0 && (
                <Button variant="link" size="sm" onClick={handleMarkAllAsRead} disabled={isPending}>
                    Mark all as read
                </Button>
            )}
        </div>
        <ScrollArea className="h-96">
            <div className="p-2">
                {isLoading ? (
                     [...Array(5)].map((_, i) => (
                        <div key={i} className="flex items-center gap-4 p-2">
                            <Skeleton className="h-8 w-8 rounded-full" />
                            <div className="space-y-2 flex-1">
                                <Skeleton className="h-4 w-4/5" />
                                <Skeleton className="h-3 w-1/2" />
                            </div>
                        </div>
                    ))
                ) : notifications.length > 0 ? (
                     notifications.map((n) => (
                        <div key={n._id} className={cn("flex gap-3 p-2 rounded-lg", !n.isRead && "bg-muted")}>
                           <div className="p-2"> <NotificationIcon type={n.type} /></div>
                            <div className="flex-1">
                                <p className="text-sm">{n.message}</p>
                                <p className="text-xs text-muted-foreground">
                                    {formatDistanceToNow(new Date(n.timestamp), { addSuffix: true })}
                                </p>
                            </div>
                            {!n.isRead && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleMarkAsRead(n._id)}
                                    title="Mark as read"
                                    disabled={isPending}
                                    className="shrink-0"
                                >
                                    <Check className="size-4" />
                                </Button>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="text-center text-muted-foreground p-8">
                        <Bell className="mx-auto size-12 mb-4" />
                        <p>You have no notifications.</p>
                    </div>
                )}
            </div>
        </ScrollArea>
        {notifications.length > 0 && (
            <div className="p-2 border-t text-center">
                 <Button
                    variant="destructive"
                    size="sm"
                    className="w-full"
                    onClick={() => setShowClearConfirm(true)}
                    disabled={isPending}
                >
                    <Trash2 className="mr-2" />
                    Clear All Notifications
                </Button>
            </div>
        )}
      </PopoverContent>
    </Popover>

     <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete all of
              your notifications.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearAll}
              className="bg-destructive hover:bg-destructive/90"
              disabled={isPending}
            >
              {isPending && <Loader2 className="animate-spin mr-2" />}
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
