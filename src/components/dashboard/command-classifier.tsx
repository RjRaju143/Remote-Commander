
"use client";

import { useActionState } from "react";
import { handleGenerateCommand, type GenerateCommandState } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bot, Loader2, HelpCircle, Clipboard, ClipboardCheck } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export function CommandClassifier() {
  const initialState: GenerateCommandState = {};
  const [state, formAction, pending] = useActionState(handleGenerateCommand, initialState);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = () => {
    if (!state?.result?.command) return;
    navigator.clipboard.writeText(state.result.command);
    setCopied(true);
    toast({ title: "Copied!", description: "Command copied to clipboard." });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section>
      <h2 className="text-2xl font-semibold font-headline mb-4">AI Command Generator</h2>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Generate a Command</CardTitle>
          <CardDescription>
            Describe the task you want to perform, and our AI will suggest a command for you.
          </CardDescription>
        </CardHeader>
        <form action={formAction}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="request">Your Request</Label>
              <Input
                id="request"
                name="request"
                placeholder="e.g., `list all running processes`"
                defaultValue={state?.input}
              />
              {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
                <HelpCircle className="size-4" />
                <span>Powered by Genkit AI</span>
            </p>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : <Bot />}
              Generate Command
            </Button>
          </CardFooter>
        </form>
        {state?.result && (
          <CardContent>
              <div className="bg-muted p-4 rounded-lg space-y-3">
                <h4 className="font-semibold">Suggested Command:</h4>
                <div className="flex items-center justify-between gap-4 bg-background p-3 rounded-md">
                  <code className="font-code text-primary">{state.result.command}</code>
                   <Button variant="ghost" size="icon" onClick={handleCopy}>
                    {copied ? <ClipboardCheck className="text-accent" /> : <Clipboard />}
                    <span className="sr-only">Copy command</span>
                  </Button>
                </div>
                 <p className="text-sm text-muted-foreground">{state.result.description}</p>
              </div>
          </CardContent>
        )}
      </Card>
    </section>
  );
}
