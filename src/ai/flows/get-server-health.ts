'use server';
/**
 * @fileOverview A flow to get health metrics from a remote server.
 *
 * - getServerHealth - A function that connects to a server and retrieves health data.
 * - GetServerHealthInput - The input type for the getServerHealth function.
 * - GetServerHealthOutput - The return type for the getServerHealth function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getServerById } from '@/lib/actions';
import { Client } from 'ssh2';
import CryptoJS from 'crypto-js';

const GetServerHealthInputSchema = z.object({
  serverId: z.string().describe('The ID of the server to check.'),
});
export type GetServerHealthInput = z.infer<typeof GetServerHealthInputSchema>;

const GetServerHealthOutputSchema = z.object({
  cpuUsage: z.number().describe('CPU usage percentage.'),
  memoryUsage: z.number().describe('Memory usage percentage.'),
  diskUsage: z.number().describe('Disk usage percentage.'),
});
export type GetServerHealthOutput = z.infer<typeof GetServerHealthOutputSchema>;

function decrypt(ciphertext: string): string {
    const secret = process.env.ENCRYPTION_SECRET;
    if (!secret) {
      throw new Error('ENCRYPTION_SECRET is not set in the environment variables.');
    }
    const bytes = CryptoJS.AES.decrypt(ciphertext, secret);
    return bytes.toString(CryptoJS.enc.Utf8);
}

function executeCommand(conn: Client, command: string): Promise<string> {
    return new Promise((resolve, reject) => {
        let output = '';
        conn.exec(command, (err, stream) => {
            if (err) return reject(err);
            stream.on('close', (code: number) => {
                if (code !== 0) {
                    return reject(new Error(`Command failed with code ${code}: ${output}`));
                }
                resolve(output.trim());
            }).on('data', (data: Buffer) => {
                output += data.toString('utf8');
            }).stderr.on('data', (data: Buffer) => {
                output += data.toString('utf8');
            });
        });
    });
}

const getServerHealthFlow = ai.defineFlow(
  {
    name: 'getServerHealthFlow',
    inputSchema: GetServerHealthInputSchema,
    outputSchema: GetServerHealthOutputSchema,
  },
  async ({ serverId }) => {
    const serverCreds = await getServerById(serverId);
    if (!serverCreds) {
      throw new Error('Server not found or permission denied.');
    }

    if (serverCreds.privateKey) {
        serverCreds.privateKey = decrypt(serverCreds.privateKey);
    }

    return new Promise((resolve, reject) => {
      const conn = new Client();
      conn.on('ready', async () => {
        try {
          // Commands to get health stats
          const cpuCommand = "top -bn1 | grep 'Cpu(s)' | sed 's/.*, *\\([0-9.]*\\)%* id.*/\\1/' | awk '{print 100 - $1}'";
          const memCommand = "free | awk '/Mem/ {printf(\"%.2f\", $3/$2 * 100.0)}'";
          const diskCommand = "df / | awk 'NR==2 {print $5}' | sed 's/%//'";

          const [cpuOutput, memOutput, diskOutput] = await Promise.all([
            executeCommand(conn, cpuCommand),
            executeCommand(conn, memCommand),
            executeCommand(conn, diskCommand),
          ]);
          
          conn.end();

          resolve({
            cpuUsage: parseFloat(cpuOutput) || 0,
            memoryUsage: parseFloat(memOutput) || 0,
            diskUsage: parseFloat(diskOutput) || 0,
          });
        } catch (error) {
          conn.end();
          reject(error);
        }
      }).on('error', (err) => {
        reject(new Error(`Connection failed: ${err.message}`));
      }).connect({
        host: serverCreds.ip,
        port: Number(serverCreds.port),
        username: serverCreds.username,
        privateKey: serverCreds.privateKey,
        readyTimeout: 10000,
      });
    });
  }
);

export async function getServerHealth(input: GetServerHealthInput): Promise<GetServerHealthOutput> {
  return getServerHealthFlow(input);
}
