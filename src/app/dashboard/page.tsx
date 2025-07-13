import { CommandClassifier } from "@/components/dashboard/command-classifier";
import { ServerList } from "@/components/dashboard/server-list";
import { Separator } from "@/components/ui/separator";

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Manage your servers and analyze commands with AI.
        </p>
      </div>
      
      <ServerList />

      <Separator />

      <CommandClassifier />
    </div>
  );
}
