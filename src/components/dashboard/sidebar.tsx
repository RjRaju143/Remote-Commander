"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
import { Terminal, Server, FileText, Settings, LogOut, VenetianMask } from "lucide-react";
import { handleLogout } from "@/lib/actions";

const menuItems = [
  { href: "/dashboard", label: "Servers", icon: Server },
  { href: "/dashboard/logs", label: "Command Logs", icon: FileText },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function DashboardSidebar() {
  const pathname = usePathname();

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
                  isActive={pathname === item.href}
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
                <AvatarImage src="https://placehold.co/100x100.png" alt="User" data-ai-hint="person avatar" />
                <AvatarFallback>U</AvatarFallback>
            </Avatar>
            <div className="flex flex-col group-data-[collapsible=icon]:hidden">
                <span className="font-semibold text-sm">Demo User</span>
                <span className="text-xs text-muted-foreground">admin@example.com</span>
            </div>
        </div>
        <Button variant="ghost" className="w-full justify-start gap-2" onClick={handleLogout}>
          <LogOut className="size-5" />
          <span className="group-data-[collapsible=icon]:hidden">Logout</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
