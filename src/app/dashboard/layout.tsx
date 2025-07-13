
import { DashboardHeader } from "@/app/dashboard/header";
import { DashboardSidebar } from "@/app/dashboard/sidebar";
import { getCurrentUser } from "@/lib/actions";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <SidebarProvider>
      <DashboardSidebar user={user} />
      <SidebarInset>
        <div className="flex h-full flex-col">
          <DashboardHeader />
          <main className="flex-1 overflow-y-auto p-4 pt-6 md:p-8">
            {children}
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
