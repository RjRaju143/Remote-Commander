import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CommandLog } from "@/lib/types";
import { CheckCircle2, XCircle } from "lucide-react";

const mockLogs: CommandLog[] = [
  { id: '1', command: 'sudo apt update', user: 'demo_user', server: 'Production Web Server', timestamp: new Date(Date.now() - 3600000).toISOString(), status: 'success' },
  { id: '2', command: 'ls -la /var/www', user: 'demo_user', server: 'Production Web Server', timestamp: new Date(Date.now() - 3540000).toISOString(), status: 'success' },
  { id: '3', command: 'nano /etc/nginx/nginx.conf', user: 'demo_user', server: 'Production Web Server', timestamp: new Date(Date.now() - 3480000).toISOString(), status: 'error' },
  { id: '4', command: 'ps aux | grep "node"', user: 'demo_user', server: 'Staging DB', timestamp: new Date(Date.now() - 7200000).toISOString(), status: 'success' },
  { id: '5', command: 'rm -rf /tmp/old_data', user: 'demo_user', server: 'Dev-Box-01', timestamp: new Date(Date.now() - 86400000).toISOString(), status: 'success' },
];

export default function LogsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">Command Logs</h1>
        <p className="text-muted-foreground">
          An audit trail of all commands executed on your servers.
        </p>
      </div>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Command</TableHead>
              <TableHead>Server</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Timestamp</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockLogs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="font-code font-medium">{log.command}</TableCell>
                <TableCell>{log.server}</TableCell>
                <TableCell>{log.user}</TableCell>
                <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                <TableCell className="text-right">
                  <Badge variant={log.status === 'success' ? 'outline' : 'destructive'} className="border-none">
                    {log.status === 'success' ? 
                      <CheckCircle2 className="mr-2 text-accent" /> : 
                      <XCircle className="mr-2" />}
                    {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
