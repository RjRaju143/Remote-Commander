
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCurrentUser, handleChangePassword, handleUpdateProfile } from "@/lib/actions";
import { useEffect, useState, useCallback, useActionState } from "react";
import type { User } from "@/models/User";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


function ChangePasswordForm() {
    const { toast } = useToast();
    const [state, formAction, pending] = useActionState(handleChangePassword, undefined);
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

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
                description: "Your password has been changed successfully.",
            });
            // This is a simple way to reset form fields after successful submission with useActionState
            // by targeting the form element and calling reset().
            const form = document.getElementById('changePasswordForm') as HTMLFormElement;
            form?.reset();
        }
    }, [state, toast]);

    return (
        <form action={formAction} id="changePasswordForm">
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


export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);

  const fetchUser = useCallback(async () => {
    const userData = await getCurrentUser();
    setUser(userData);
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return (
    <div className="space-y-8">
       <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and application preferences.
        </p>
      </div>

      <Tabs defaultValue="profile" className="w-full max-w-2xl">
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile">Profile</TabsTrigger>
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
