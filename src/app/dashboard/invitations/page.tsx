
import { getReceivedInvitations } from "@/lib/invitations";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MailOpen } from "lucide-react";
import { InvitationList } from "@/components/dashboard/invitation-list";

export default async function InvitationsPage() {
  const invitations = await getReceivedInvitations();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">
          My Invitations
        </h1>
        <p className="text-muted-foreground">
          Invitations from other users to access their servers.
        </p>
      </div>

      {invitations.length > 0 ? (
        <InvitationList initialInvitations={invitations} />
      ) : (
        <Card className="flex flex-col items-center justify-center p-8 text-center">
            <CardHeader>
                <div className="mx-auto bg-primary/10 text-primary p-4 rounded-full mb-4">
                    <MailOpen className="size-10" />
                </div>
                <CardTitle>No Pending Invitations</CardTitle>
                <CardDescription>
                    You don't have any pending invitations right now.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm">
                    When another user invites you to access their server, it will show up here.
                </p>
            </CardContent>
        </Card>
      )}
    </div>
  );
}
