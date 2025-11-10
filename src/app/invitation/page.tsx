
'use client';

import { useEffect, useState, useTransition } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { handleInvitation, getCurrentUser } from '@/lib/actions';
import { getInvitationByToken } from '@/lib/invitations';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, MailWarning, Check, X, User } from 'lucide-react';
import Link from 'next/link';
import type { InvitationWithDetails } from '@/lib/invitations';

type Status = 'loading' | 'valid' | 'invalid' | 'error' | 'not_logged_in' | 'wrong_user' | 'processing';

export default function InvitationPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get('token');
    
    const [status, setStatus] = useState<Status>('loading');
    const [invitation, setInvitation] = useState<InvitationWithDetails | null>(null);
    const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        if (!token) {
            setStatus('invalid');
            setError('No invitation token provided.');
            return;
        }

        async function verifyInvitation() {
            try {
                const user = await getCurrentUser();
                if (!user) {
                    setStatus('not_logged_in');
                    return;
                }
                setCurrentUserEmail(user.email);
                
                const inv = await getInvitationByToken(token as string);
                if (!inv) {
                    setStatus('invalid');
                    setError('This invitation is either invalid or has expired.');
                    return;
                }
                
                if (inv.email !== user.email) {
                    setInvitation(inv);
                    setStatus('wrong_user');
                    return;
                }

                setInvitation(inv);
                setStatus('valid');

            } catch (e: any) {
                setStatus('error');
                setError(e.message || 'An unexpected error occurred.');
            }
        }
        
        verifyInvitation();

    }, [token]);

    const handleResponse = (action: 'accept' | 'decline') => {
        if (!token) return;
        setStatus('processing');
        startTransition(async () => {
            const result = await handleInvitation(token, action);
            if (result.error) {
                setStatus('error');
                setError(result.error);
            } else if (result.success && result.serverId) {
                router.push(`/dashboard/server/${result.serverId}`);
            } else {
                router.push('/dashboard');
            }
        });
    }

    function renderContent() {
        switch (status) {
            case 'loading':
            case 'processing':
                return (
                     <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                        <Loader2 className="size-12 animate-spin mb-4" />
                        <p className="text-xl">{status === 'loading' ? 'Verifying invitation...' : 'Processing your response...'}</p>
                     </div>
                );
            case 'not_logged_in':
                return (
                     <CardContent className="text-center">
                        <User className="size-12 mx-auto text-primary mb-4" />
                        <CardTitle>Please Log In</CardTitle>
                        <CardDescription className="my-4">You need to be logged in to respond to this invitation.</CardDescription>
                        <Button asChild className="w-full">
                            <Link href={`/?redirect=/invitation?token=${token}`}>Log In or Register</Link>
                        </Button>
                    </CardContent>
                );
            case 'wrong_user':
                 return (
                     <CardContent className="text-center">
                        <MailWarning className="size-12 mx-auto text-destructive mb-4" />
                        <CardTitle>Account Mismatch</CardTitle>
                        <CardDescription className="my-4">
                            This invitation was sent to <span className="font-bold">{invitation?.email}</span>, but you are logged in as <span className="font-bold">{currentUserEmail}</span>.
                        </CardDescription>
                        <p className="text-sm text-muted-foreground">Please log out and sign in with the correct account to accept this invitation.</p>
                        <Button asChild variant="outline" className="w-full mt-4">
                            <Link href="/dashboard">Go to Dashboard</Link>
                        </Button>
                    </CardContent>
                );
            case 'invalid':
            case 'error':
                 return (
                     <CardContent className="text-center">
                        <MailWarning className="size-12 mx-auto text-destructive mb-4" />
                        <CardTitle>Invitation {status === 'invalid' ? 'Invalid' : 'Error'}</CardTitle>
                        <CardDescription className="my-4">{error}</CardDescription>
                        <Button asChild className="w-full">
                            <Link href="/dashboard">Go to Dashboard</Link>
                        </Button>
                    </CardContent>
                );
            case 'valid':
                if (!invitation) return null;
                return (
                    <>
                        <CardHeader>
                            <CardTitle>You're Invited!</CardTitle>
                            <CardDescription>
                                <span className="font-bold">{invitation.owner.email}</span> has invited you to access the server <span className="font-bold">{invitation.server.name}</span> with <span className="font-bold">{invitation.permission}</span> permissions.
                            </CardDescription>
                        </CardHeader>
                        <CardFooter className="flex gap-4">
                            <Button className="w-full" onClick={() => handleResponse('accept')} disabled={isPending}>
                                <Check className="mr-2" /> Accept
                            </Button>
                            <Button variant="outline" className="w-full" onClick={() => handleResponse('decline')} disabled={isPending}>
                               <X className="mr-2" /> Decline
                            </Button>
                        </CardFooter>
                    </>
                );
        }
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-4">
            <Card className="w-full max-w-md">
                {renderContent()}
            </Card>
        </div>
    );
}
