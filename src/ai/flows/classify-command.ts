'use server';

/**
 * @fileOverview Classifies a terminal command into predefined categories using AI.
 *
 * - classifyCommand - A function that classifies the given terminal command.
 * - ClassifyCommandInput - The input type for the classifyCommand function.
 * - ClassifyCommandOutput - The return type for the classifyCommand function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ClassifyCommandInputSchema = z.object({
  command: z
    .string()
    .describe('The terminal command to classify, for example, `ls -l`.'),
});
export type ClassifyCommandInput = z.infer<typeof ClassifyCommandInputSchema>;

const ClassifyCommandOutputSchema = z.object({
  category: z
    .string()
    .describe(
      'The category of the command.  Possible values: Network, File Management, System Info, Process Management, User Management, Disk Management, or Other.'
    ),
  confidence: z
    .number()
    .describe(
      'The confidence level of the classification, from 0 to 1.  Higher values indicate more certainty.'
    ),
});
export type ClassifyCommandOutput = z.infer<typeof ClassifyCommandOutputSchema>;

export async function classifyCommand(input: ClassifyCommandInput): Promise<ClassifyCommandOutput> {
  return classifyCommandFlow(input);
}

const prompt = ai.definePrompt({
  name: 'classifyCommandPrompt',
  input: {schema: ClassifyCommandInputSchema},
  output: {schema: ClassifyCommandOutputSchema},
  prompt: `You are a command line expert. Classify the following terminal command into one of these categories: Network, File Management, System Info, Process Management, User Management, Disk Management, or Other.

  Return a JSON object with the \"category\" and \"confidence\" (0 to 1) for your classification.

  Command: {{{command}}}`,
});

const classifyCommandFlow = ai.defineFlow(
  {
    name: 'classifyCommandFlow',
    inputSchema: ClassifyCommandInputSchema,
    outputSchema: ClassifyCommandOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
