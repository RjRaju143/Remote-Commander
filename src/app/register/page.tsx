import { RegisterForm } from "@/components/register-form";
import { Terminal } from "lucide-react";
import Link from "next/link";

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center space-y-4">
          <div className="rounded-full bg-primary/10 p-4 text-primary">
            <Terminal className="h-10 w-10" />
          </div>
          <h1 className="font-headline text-4xl font-bold tracking-tighter text-center">
            Create an Account
          </h1>
          <p className="text-muted-foreground text-center">
            Get started with Remote Commander.
          </p>
        </div>
        <RegisterForm />
         <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/" className="font-semibold text-primary hover:underline">
            Login here
          </Link>
        </p>
        <p className="text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Remote Commander. All rights reserved.
        </p>
      </div>
    </div>
  );
}
