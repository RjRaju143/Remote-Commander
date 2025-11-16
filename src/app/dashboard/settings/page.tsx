
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { handleChangePassword, handleUpdateProfile, getUserForProfile, getUserOrganization, updateOrganization } from "@/lib/actions";
import { useEffect, useState, useCallback, useActionState, useRef } from "react";
import type { User } from "@/models/User";
import type { Organization } from "@/models/Organization";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter } from "next/navigation";


function ChangePasswordForm() {
    const { toast, notify } = useToast();
    const router = useRouter();
    const [state, formAction, pending] = useActionState(handleChangePassword, undefined);
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);

    useEffect(() => {
        if (state?.error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: state.error,
            });
        }
        if (state?.success) {
            toast({
                title: "Success",
                description: "Your password has been changed successfully. Please log in again.",
            });
            if (state.notification) {
                notify();
            }
            formRef.current?.reset();
            
            // Redirect to login after password change
            setTimeout(() => {
                router.push('/');
            }, 2000);
        }
    }, [state?.error, state?.success, state?.notification, router]);

    return (
        <form action={formAction} ref={formRef}>
            <CardContent className="space-y-4 pt-6">
                 <CardDescription>Update your password here. It's recommended to use a strong, unique password.</CardDescription>
                <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <div className="relative">
                        <Input id="currentPassword" name="currentPassword" type={showCurrent ? "text" : "password"} required />
                         <Button type="button" variant="ghost" size="icon" className="absolute inset-y-0 right-0 h-full px-3" onClick={() => setShowCurrent(p => !p)}>
                            {showCurrent ? <EyeOff /> : <Eye />}
                         </Button>
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <div className="relative">
                        <Input id="newPassword" name="newPassword" type={showNew ? "text" : "password"} required />
                         <Button type="button" variant="ghost" size="icon" className="absolute inset-y-0 right-0 h-full px-3" onClick={() => setShowNew(p => !p)}>
                            {showNew ? <EyeOff /> : <Eye />}
                         </Button>
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <div className="relative">
                        <Input id="confirmPassword" name="confirmPassword" type={showConfirm ? "text" : "password"} required />
                        <Button type="button" variant="ghost" size="icon" className="absolute inset-y-0 right-0 h-full px-3" onClick={() => setShowConfirm(p => !p)}>
                            {showConfirm ? <EyeOff /> : <Eye />}
                         </Button>
                    </div>
                </div>
                {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
                <Button type="submit" disabled={pending}>
                    {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Change Password
                </Button>
            </CardContent>
        </form>
    );
}

function ProfileForm({ user, onProfileUpdate }: { user: User | null; onProfileUpdate: () => void; }) {
    const { toast } = useToast();
    const [state, formAction, pending] = useActionState(handleUpdateProfile, undefined);

    useEffect(() => {
        if (state?.error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: state.error,
            });
        }
        if (state?.success) {
            toast({
                title: "Success",
                description: "Your profile has been updated.",
            });
            onProfileUpdate();
        }
    }, [state, toast, onProfileUpdate]);
    
    return (
         <form action={formAction}>
            <CardContent className="space-y-4 pt-6">
                <CardDescription>This is how others will see you on the site.</CardDescription>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input key={user?.firstName} id="firstName" name="firstName" defaultValue={user?.firstName || ''} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input key={user?.lastName} id="lastName" name="lastName" defaultValue={user?.lastName || ''} required />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" defaultValue={user?.email || ''} readOnly />
                </div>
                {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
                <Button type="submit" disabled={pending}>
                    {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                </Button>
            </CardContent>
        </form>
    );
}


function OrganizationForm({ organization, onUpdate }: { organization: Organization | null; onUpdate: () => void; }) {
    const { toast } = useToast();
    const [pending, setPending] = useState(false);

    const handleSubmit = async (formData: FormData) => {
        setPending(true);
        try {
            const data = {
                name: formData.get("name") as string,
                employeeCount: formData.get("employeeCount") as string,
                role: formData.get("role") as string,
            };
            
            const result = await updateOrganization(data);
            if (result.success) {
                toast({
                    title: "Success",
                    description: "Organization updated successfully.",
                });
                onUpdate();
            } else {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: result.error || "Failed to update organization",
                });
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to update organization",
            });
        } finally {
            setPending(false);
        }
    };

    return (
        <form action={handleSubmit}>
            <CardContent className="space-y-4 pt-6">
                <CardDescription>Update your organization information.</CardDescription>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Organization Name</Label>
                        <Input 
                            key={organization?.name} 
                            id="name" 
                            name="name" 
                            defaultValue={organization?.name || ''} 
                            required 
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="employeeCount">Employee Count</Label>
                        <Select name="employeeCount" defaultValue={organization?.employeeCount || '0-50'}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="0-50">0-50</SelectItem>
                                <SelectItem value="50-100">50-100</SelectItem>
                                <SelectItem value="100-500">100-500</SelectItem>
                                <SelectItem value="500+">500+</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="role">Your Role</Label>
                        <Input 
                            key={organization?.role} 
                            id="role" 
                            name="role" 
                            defaultValue={organization?.role || ''} 
                            required 
                        />
                    </div>
                </div>
                <Button type="submit" disabled={pending}>
                    {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                </Button>
            </CardContent>
        </form>
    );
}


export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    const userData = await getUserForProfile();
    setUser(userData);
  }, []);

  const fetchOrganization = useCallback(async () => {
    try {
      const orgData = await getUserOrganization();
      setOrganization(orgData);
    } catch (error) {
      console.error('Error fetching organization:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
    fetchOrganization();
  }, []);

  return (
    <div className="space-y-8">
       <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and application preferences.
        </p>
      </div>

      <Tabs defaultValue="profile" className="w-full max-w-2xl">
        <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="organization">Organization</TabsTrigger>
            <TabsTrigger value="password">Password</TabsTrigger>
        </TabsList>
        <TabsContent value="profile">
            <Card>
                <CardHeader>
                    <CardTitle>Account Profile</CardTitle>
                </CardHeader>
                <ProfileForm user={user} onProfileUpdate={fetchUser} />
            </Card>
        </TabsContent>
        <TabsContent value="organization">
            <Card>
                <CardHeader>
                    <CardTitle>Organization</CardTitle>
                </CardHeader>
                {loading ? (
                    <CardContent className="space-y-4 pt-6">
                        <div className="flex items-center space-x-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Loading organization data...</span>
                        </div>
                    </CardContent>
                ) : organization ? (
                    <OrganizationForm organization={organization} onUpdate={fetchOrganization} />
                ) : (
                    <CardContent className="space-y-4 pt-6">
                        <p className="text-muted-foreground">No organization information found.</p>
                    </CardContent>
                )}
            </Card>
        </TabsContent>
        <TabsContent value="password">
            <Card>
                <CardHeader>
                    <CardTitle>Change Password</CardTitle>
                </CardHeader>
                <ChangePasswordForm />
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
