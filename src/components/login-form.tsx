
"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, LogIn, Eye, EyeOff } from "lucide-react";
import { handleLogin, type AuthState } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";

function LoginFormFields() {
  const [state, formAction, pending] = useActionState(handleLogin, undefined);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (state?.error) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: state.error,
      });
    }
    if (state?.success) {
      router.push(state.redirectTo || "/dashboard");
    }
  }, [state]);

  const router = useRouter();
  const { toast } = useToast();

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <form action={formAction} className="space-y-4">
        <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" placeholder="user@example.com" required />
        </div>
        <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
                 <Input 
                    id="password" 
                    name="password" 
                    type={showPassword ? "text" : "password"} 
                    required 
                 />
                 <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute inset-y-0 right-0 h-full px-3"
                    onClick={togglePasswordVisibility}
                 >
                    {showPassword ? <EyeOff /> : <Eye />}
                    <span className="sr-only">
                        {showPassword ? "Hide password" : "Show password"}
                    </span>
                 </Button>
            </div>
        </div>
        <Button type="submit" className="w-full" disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : <LogIn />}
            Sign In
        </Button>
    </form>
  );
}

export function LoginForm() {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Welcome Back</CardTitle>
        <CardDescription>Enter your credentials to access your servers.</CardDescription>
      </CardHeader>
      <CardContent>
        <LoginFormFields />
      </CardContent>
    </Card>
  );
}
