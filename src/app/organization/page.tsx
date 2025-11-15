
'use client';

import { useActionState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { handleCreateOrganization, type AuthState } from '@/lib/actions';
import { EmployeeCountRanges, UserRolesInOrg } from '@/models/Organization';
import { useToast } from "@/hooks/use-toast";
import { Loader2, Building } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Image from 'next/image';
import placeholderImages from '@/lib/placeholder-images.json';


const OrgSetupSchema = z.object({
  name: z.string().min(1, "Organization name is required."),
  employeeCount: z.enum(EmployeeCountRanges, { required_error: "Please select an employee range." }),
  userRole: z.enum(UserRolesInOrg, { required_error: "Please select your role." }),
});

type OrgSetupFormValues = z.infer<typeof OrgSetupSchema>;

export default function OrganizationSetupPage() {
  const [state, formAction, pending] = useActionState(handleCreateOrganization, undefined);
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<OrgSetupFormValues>({
    resolver: zodResolver(OrgSetupSchema),
    defaultValues: {
      name: '',
    },
  });
  
  const orgPlaceholder = useMemo(() => placeholderImages.find(p => p.id === "organization-setup"), []);


  useEffect(() => {
    if (state?.error) {
      toast({
        variant: "destructive",
        title: "Setup Failed",
        description: state.error,
      });
    }
    if (state?.success) {
      toast({
        title: "Setup Complete!",
        description: "Your organization has been created.",
      });
      router.push("/dashboard");
    }
  }, [state, toast, router]);

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2 xl:min-h-screen">
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-[350px] gap-6">
          <div className="grid gap-2 text-center">
            <Building className="h-10 w-10 mx-auto text-primary" />
            <h1 className="text-3xl font-bold font-headline">Tell us about your organization</h1>
            <p className="text-balance text-muted-foreground">
              This one-time setup will help us tailor your experience.
            </p>
          </div>
          <Form {...form}>
            <form action={formAction} className="grid gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Acme Inc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="employeeCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Employees</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a range" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {EmployeeCountRanges.map(range => (
                          <SelectItem key={range} value={range}>{range}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="userRole"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {UserRolesInOrg.map(role => (
                          <SelectItem key={role} value={role}>{role}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                     <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={pending}>
                {pending && <Loader2 className="animate-spin mr-2" />}
                Finish Setup
              </Button>
            </form>
          </Form>
        </div>
      </div>
      <div className="hidden bg-muted lg:block">
        {orgPlaceholder && (
             <Image
                src={orgPlaceholder.url}
                alt={orgPlaceholder.alt}
                width={orgPlaceholder.width}
                height={orgPlaceholder.height}
                data-ai-hint={orgPlaceholder.hint}
                className="h-full w-full object-cover dark:brightness-[0.4]"
            />
        )}
      </div>
    </div>
  );
}
