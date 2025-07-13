import { getGuestAccessDetails } from "@/lib/actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Server, Users } from "lucide-react";
import { GuestList } from "@/components/dashboard/guest-list";

export default async function GuestsPage() {
  const guestDetails = await getGuestAccessDetails();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">
          Guest Management
        </h1>
        <p className="text-muted-foreground">
          View and manage users who have access to your servers.
        </p>
      </div>

      {guestDetails.length > 0 ? (
        <GuestList initialGuestDetails={guestDetails} />
      ) : (
        <Card className="flex flex-col items-center justify-center p-8 text-center">
            <CardHeader>
                <div className="mx-auto bg-primary/10 text-primary p-4 rounded-full mb-4">
                    <Users className="size-10" />
                </div>
                <CardTitle>No Guests Found</CardTitle>
                <CardDescription>
                    You haven't shared any servers with other users yet.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm">
                    To share a server, go to the <a href="/dashboard" className="text-primary hover:underline">Servers</a> page, click the three-dot menu on a server card, and select "Share".
                </p>
            </CardContent>
        </Card>
      )}
    </div>
  );
}
