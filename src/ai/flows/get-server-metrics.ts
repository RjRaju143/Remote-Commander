'use server';

/**
 * @fileOverview Generates a command to fetch server metrics.
 *
 * - getServerMetricsCommand - A function that generates a command to get CPU, memory, and disk usage.
 * - GetServerMetricsOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';


const GetServerMetricsOutputSchema = z.object({
  command: z
    .string()
    .describe(
      'A single, efficient linux command to get CPU usage percentage, memory usage percentage, and root filesystem disk usage percentage. The output should be a single line, space-separated string: "CPU_USAGE MEM_USAGE DISK_USAGE"'
    ),
});
export type GetServerMetricsOutput = z.infer<typeof GetServerMetricsOutputSchema>;

export async function getServerMetricsCommand(): Promise<GetServerMetricsOutput> {
  return getServerMetricsCommandFlow();
}

const prompt = ai.definePrompt({
  name: 'getServerMetricsCommandPrompt',
  output: {schema: GetServerMetricsOutputSchema},
  prompt: `You are a Linux command line expert. Provide a single, efficient, and POSIX-compliant shell command to get the current system metrics.

The command must output a single line with three space-separated values:
1.  CPU usage as a percentage (e.g., 25.5).
2.  Memory usage as a percentage (e.g., 60.1).
3.  Root filesystem ('/') disk usage as a percentage (e.g., 45.8).

Do not include any headers, extra text, or percentage signs in the output. The output format must be exactly: "CPU_PERCENT MEM_PERCENT DISK_PERCENT".

Example of a command that might achieve this:
echo $(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\\([0-9.]*\\)%* id.*/\\1/" | awk '{print 100 - $1}') $(free | grep Mem | awk '{print $3/$2 * 100.0}') $(df -h / | awk 'NR==2 {print substr($5, 1, length($5)-1)}')

Provide the best command to achieve this.`,
});

const getServerMetricsCommandFlow = ai.defineFlow(
  {
    name: 'getServerMetricsCommandFlow',
    outputSchema: GetServerMetricsOutputSchema,
  },
  async () => {
    const {output} = await prompt();
    return output!;
  }
);
