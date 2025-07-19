
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Terminal, Server, Settings, LogOut, Users, LifeBuoy, Star } from "lucide-react";
import { handleLogout } from "@/lib/actions";
import type { User } from "@/models/User";

const menuItems = [
  { href: "/dashboard", label: "Servers", icon: Server },
  { href: "/dashboard/favorites", label: "Favorites", icon: Star },
  { href: "/dashboard/guests", label: "Guests", icon: Users },
  { href: "/dashboard/support", label: "Support", icon: LifeBuoy },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

type DashboardSidebarProps = {
  user: User | null;
};


export function DashboardSidebar({ user }: DashboardSidebarProps) {
  const pathname = usePathname();
  const userName = user?.email?.split('@')[0] || 'User';
  const userEmail = user?.email || 'No email found';
  const avatarFallback = userName.charAt(0).toUpperCase();

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2">
          <div className="bg-primary/20 text-primary p-2 rounded-lg">
            <Terminal className="size-6" />
          </div>
          <h2 className="text-lg font-semibold font-headline group-data-[collapsible=icon]:hidden">
            Remote Commander
          </h2>
        </div>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.label}>
              <Link href={item.href} passHref>
                <SidebarMenuButton
                  isActive={pathname.startsWith(item.href) && (item.href !== '/dashboard' || pathname === '/dashboard')}
                  tooltip={{
                    children: item.label,
                    className: "bg-primary text-primary-foreground",
                  }}
                  asChild
                >
                  <div>
                    <item.icon className="size-5" />
                    <span>{item.label}</span>
                  </div>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-2">
        <Separator className="my-2" />
        <div className="flex items-center gap-3 p-2 rounded-lg transition-colors">
            <Avatar className="size-10">
                <AvatarFallback>{avatarFallback}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col group-data-[collapsible=icon]:hidden">
                <span className="font-semibold text-sm truncate">{userName}</span>
                <span className="text-xs text-muted-foreground truncate">{userEmail}</span>
            </div>
        </div>
        <form action={handleLogout} className="w-full">
          <Button variant="ghost" type="submit" className="w-full justify-start gap-2">
            <LogOut className="size-5" />
            <span className="group-data-[collapsible=icon]:hidden">Logout</span>
          </Button>
        </form>
      </SidebarFooter>
    </Sidebar>
  );
}
