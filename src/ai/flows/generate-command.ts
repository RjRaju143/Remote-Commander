'use server';

/**
 * @fileOverview Generates a terminal command from a natural language description.
 *
 * - generateCommand - A function that generates a command based on a user's request.
 * - GenerateCommandInput - The input type for the generateCommand function.
 * - GenerateCommandOutput - The return type for the generateCommand function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateCommandInputSchema = z.object({
  request: z
    .string()
    .describe('The natural language request for a command, for example, `list all files`.'),
});
export type GenerateCommandInput = z.infer<typeof GenerateCommandInputSchema>;

const GenerateCommandOutputSchema = z.object({
  command: z
    .string()
    .describe(
      'The suggested terminal command.'
    ),
  description: z
    .string()
    .describe(
      'A brief explanation of what the command does.'
    ),
});
export type GenerateCommandOutput = z.infer<typeof GenerateCommandOutputSchema>;

export async function generateCommand(input: GenerateCommandInput): Promise<GenerateCommandOutput> {
  return generateCommandFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateCommandPrompt',
  input: {schema: GenerateCommandInputSchema},
  output: {schema: GenerateCommandOutputSchema},
  prompt: `You are a Linux command line expert. Based on the user's request, provide the most appropriate and common terminal command. Also, provide a brief, one-sentence description of what the command does.

  Return a JSON object with the "command" and "description".

  Request: {{{request}}}`,
});

const generateCommandFlow = ai.defineFlow(
  {
    name: 'generateCommandFlow',
    inputSchema: GenerateCommandInputSchema,
    outputSchema: GenerateCommandOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);


// Action State
export interface GenerateCommandState {
  result?: GenerateCommandOutput;
  error?: string;
  input?: string;
}

const RequestSchema = z.string().min(1, { message: "Request is required." });

export async function handleGenerateCommand(
  prevState: GenerateCommandState,
  formData: FormData
): Promise<GenerateCommandState> {
  const request = formData.get("request");
  const validatedRequest = RequestSchema.safeParse(request);

  if (!validatedRequest.success) {
    return { error: "Please enter a valid request." };
  }

  const input = validatedRequest.data;

  try {
    const result = await generateCommand({ request: input });
    return { result, input };
  } catch (error) {
    console.error("Generation failed:", error);
    return { error: "AI generation failed. Please try again.", input };
  }
}
