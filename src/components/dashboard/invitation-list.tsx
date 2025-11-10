
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { handleInvitation } from '@/lib/actions';
import type { InvitationWithDetails } from '@/lib/invitations';
import { Badge } from '../ui/badge';
import { getPermissionBadgeVariant } from '@/lib/utils';
import { Check, Loader2, X } from 'lucide-react';

type ReceivedInvitation = Omit<InvitationWithDetails, '_id'> & { token: string };

export function InvitationList({ initialInvitations }: { initialInvitations: ReceivedInvitation[] }) {
  const [invitations, setInvitations] = useState(initialInvitations);
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const router = useRouter();

  const handleResponse = async (token: string, action: 'accept' | 'decline') => {
    setLoadingStates(prev => ({ ...prev, [token]: true }));

    const result = await handleInvitation(token, action);

    if (result.error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: result.error,
      });
    } else {
      toast({
        title: `Invitation ${action === 'accept' ? 'Accepted' : 'Declined'}`,
        description: result.message || `The invitation has been ${action}ed.`,
      });
      setInvitations(prev => prev.filter(inv => inv.token !== token));
      
      if (action === 'accept' && result.serverId) {
        router.push(`/dashboard/server/${result.serverId}`);
      } else {
        router.refresh();
      }
    }

    setLoadingStates(prev => ({ ...prev, [token]: false }));
  };

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {invitations.map(inv => (
        <Card key={inv.token} className="flex flex-col">
          <CardHeader>
            <CardTitle className="font-headline">{inv.server.name}</CardTitle>
            <CardDescription>
              Invited by <span className="font-medium">{inv.owner.email}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
            <p className="text-sm font-semibold">You will be granted:</p>
            <Badge variant={getPermissionBadgeVariant(inv.permission)}>{inv.permission} Access</Badge>
          </CardContent>
          <CardFooter className="gap-2">
            <Button
              className="w-full"
              onClick={() => handleResponse(inv.token, 'accept')}
              disabled={loadingStates[inv.token]}
            >
              {loadingStates[inv.token] ? <Loader2 className="animate-spin" /> : <Check />}
              Accept
            </Button>
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => handleResponse(inv.token, 'decline')}
              disabled={loadingStates[inv.token]}
            >
              {loadingStates[inv.token] ? <Loader2 className="animate-spin" /> : <X />}
              Decline
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
