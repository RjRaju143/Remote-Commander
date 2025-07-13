
"use client";

import { useActionState } from "react";
import { handleClassifyCommand, type ClassifyCommandState } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bot, Loader2, BarChart3, HelpCircle } from "lucide-react";
import { Badge } from "../ui/badge";

export function CommandClassifier() {
  const initialState: ClassifyCommandState = {};
  const [state, formAction, pending] = useActionState(handleClassifyCommand, initialState);

  return (
    <section>
      <h2 className="text-2xl font-semibold font-headline mb-4">AI Command Classifier</h2>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Analyze a Command</CardTitle>
          <CardDescription>
            Enter any Linux command to see how our AI classifies it. This can help you understand command usage patterns.
          </CardDescription>
        </CardHeader>
        <form action={formAction}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="command">Command</Label>
              <Input
                id="command"
                name="command"
                placeholder="e.g., `grep -r 'error' /var/log`"
                className="font-code"
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
              Classify Command
            </Button>
          </CardFooter>
        </form>
        {state?.result && (
          <CardContent>
              <div className="bg-muted p-4 rounded-lg space-y-3">
                <h4 className="font-semibold">Classification Result:</h4>
                <div className="flex items-center gap-4">
                  <Badge className="text-lg py-1 px-3 bg-primary/20 text-primary hover:bg-primary/30">
                    <BarChart3 className="mr-2"/>
                    {state.result.category}
                  </Badge>
                  <div className="text-sm text-muted-foreground">
                    Confidence: <span className="font-bold text-foreground">{(state.result.confidence * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>
          </CardContent>
        )}
      </Card>
    </section>
  );
}
