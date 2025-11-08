
'use client';

import { useState, useEffect, useTransition } from "react";
import { getServerMetrics } from "@/lib/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Cpu, MemoryStick, Database, RefreshCcw, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type ServerMetricsProps = {
  serverId: string;
};

type Metrics = {
  cpu: number;
  memory: number;
  disk: number;
};

export function ServerMetrics({ serverId }: ServerMetricsProps) {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const fetchMetrics = () => {
    setIsLoading(true);
    startTransition(async () => {
      const result : any = await getServerMetrics(serverId);
      if (result.error) {
        toast({
          variant: "destructive",
          title: "Failed to Fetch Metrics",
          description: result.error,
        });
        setMetrics(null);
      } else if (result.success) {
        setMetrics(result.metrics);
      }
      setIsLoading(false);
    });
  };

  useEffect(() => {
    fetchMetrics();
  }, [serverId]);

  const renderMetric = (Icon: React.ElementType, label: string, value: number | undefined) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className="size-4" />
          <span>{label}</span>
        </div>
        <span className="font-semibold">{value?.toFixed(1) ?? '...'}%</span>
      </div>
      <Progress value={value} />
    </div>
  );
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle>Server Health</CardTitle>
            <CardDescription>Live CPU, memory, and disk usage.</CardDescription>
        </div>
        <Button onClick={fetchMetrics} disabled={isPending || isLoading} variant="outline" size="icon">
          {isPending || isLoading ? <Loader2 className="animate-spin" /> : <RefreshCcw />}
          <span className="sr-only">Refresh Metrics</span>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {renderMetric(Cpu, "CPU Usage", metrics?.cpu)}
        {renderMetric(MemoryStick, "Memory Usage", metrics?.memory)}
        {renderMetric(Database, "Disk Usage (/)", metrics?.disk)}
      </CardContent>
    </Card>
  );
}
