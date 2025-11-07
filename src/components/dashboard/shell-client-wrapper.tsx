
"use client";

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const ClientShell = dynamic(() => import('@/components/dashboard/shell').then(mod => mod.Shell), {
    ssr: false,
    loading: () => <Skeleton className="h-full w-full bg-[#18181b]" />,
});

interface ShellClientWrapperProps {
    serverId: string;
    username: string;
}

export function ShellClientWrapper({ serverId, username }: ShellClientWrapperProps) {
    return <ClientShell serverId={serverId} username={username} />;
}
