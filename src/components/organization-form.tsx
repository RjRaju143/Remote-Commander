"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { submitOrganization } from "@/lib/actions";
import { useRouter } from "next/navigation";

const organizationSchema = z.object({
  name: z.string().min(1, "Organization name is required"),
  employeeCount: z.enum(["0-50", "50-100", "100-500", "500+"]),
  role: z.string().min(1, "Role is required"),
});

type OrganizationForm = z.infer<typeof organizationSchema>;

export function OrganizationForm() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<OrganizationForm>({
    resolver: zodResolver(organizationSchema),
  });

  const onSubmit = async (data: OrganizationForm) => {
    setIsLoading(true);
    try {
      await submitOrganization(data);
      router.push("/dashboard");
    } catch (error) {
      console.error("Organization submission failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Organization Details</CardTitle>
          <CardDescription>Complete your registration by providing organization information</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="name">Organization Name</Label>
              <Input {...register("name")} placeholder="Enter organization name" />
              {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
            </div>

            <div>
              <Label htmlFor="employeeCount">Employee Count</Label>
              <Select onValueChange={(value) => setValue("employeeCount", value as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee count" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0-50">0-50</SelectItem>
                  <SelectItem value="50-100">50-100</SelectItem>
                  <SelectItem value="100-500">100-500</SelectItem>
                  <SelectItem value="500+">500+</SelectItem>
                </SelectContent>
              </Select>
              {errors.employeeCount && <p className="text-sm text-red-500">{errors.employeeCount.message}</p>}
            </div>

            <div>
              <Label htmlFor="role">Your Role</Label>
              <Input {...register("role")} placeholder="Enter your role" />
              {errors.role && <p className="text-sm text-red-500">{errors.role.message}</p>}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Submitting..." : "Complete Registration"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
