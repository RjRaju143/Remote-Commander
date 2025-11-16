
"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, UserPlus, Eye, EyeOff } from "lucide-react";
import { handleRegister, type AuthState } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";


function RegisterFormFields() {
  const [state, formAction, pending] = useActionState(handleRegister, undefined);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (state?.success) {
      router.push("/organization");
    }
    if (state?.error) {
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: state.error,
      });
    }
  }, [state]);

  const router = useRouter();
  const { toast } = useToast();
  
  return (
    <form action={formAction} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" name="firstName" placeholder="John" required />
            </div>
             <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" name="lastName" placeholder="Doe" required />
            </div>
        </div>
        <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" placeholder="user@example.com" required />
        </div>
        <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
            <Input id="password" name="password" type={showPassword ? "text" : "password"} required />
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute inset-y-0 right-0 h-full px-3"
                onClick={() => setShowPassword(prev => !prev)}
            >
                {showPassword ? <EyeOff /> : <Eye />}
                <span className="sr-only">{showPassword ? "Hide password" : "Show password"}</span>
            </Button>
        </div>
        </div>
        <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
         <div className="relative">
            <Input id="confirmPassword" name="confirmPassword" type={showConfirmPassword ? "text" : "password"} required />
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute inset-y-0 right-0 h-full px-3"
                onClick={() => setShowConfirmPassword(prev => !prev)}
            >
                {showConfirmPassword ? <EyeOff /> : <Eye />}
                <span className="sr-only">{showConfirmPassword ? "Hide password" : "Show password"}</span>
            </Button>
        </div>
        </div>
        <Button type="submit" className="w-full" disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : <UserPlus />}
            Create Account
        </Button>
    </form>
  );
}

export function RegisterForm() {
    return (
        <Card className="w-full">
        <CardHeader>
            <CardTitle>Register</CardTitle>
            <CardDescription>Enter your details to create an account.</CardDescription>
        </CardHeader>
        <CardContent>
            <RegisterFormFields />
        </CardContent>
        </Card>
    );
}
