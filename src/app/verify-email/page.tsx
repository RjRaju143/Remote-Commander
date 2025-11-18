"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle, XCircle, Loader2, Terminal } from "lucide-react";

function VerifyEmailContent() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [otp, setOtp] = useState('');
  const [isSubmittingOtp, setIsSubmittingOtp] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('loading');
      setMessage('Please check your email and click the verification link to continue.');
      return;
    }

    const verifyEmail = async () => {
      try {
        const response = await fetch(`/api/auth/verify-email?token=${token}`);
        const data = await response.json();

        if (response.ok) {
          setStatus('success');
          setMessage(data.message);
        } else {
          setStatus('error');
          setMessage(data.error);
        }
      } catch (error) {
        setStatus('error');
        setMessage('Failed to verify email. Please try again.');
      }
    };

    verifyEmail();
  }, [token]);

  const handleContinue = () => {
    router.push('/dashboard');
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) return;
    
    setIsSubmittingOtp(true);
    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp })
      });
      const data = await response.json();
      
      if (response.ok) {
        setStatus('success');
        setMessage(data.message);
      } else {
        setMessage(data.error);
      }
    } catch (error) {
      setMessage('Failed to verify OTP. Please try again.');
    } finally {
      setIsSubmittingOtp(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center space-y-4">
          <div className="rounded-full bg-primary/10 p-4 text-primary">
            <Terminal className="h-10 w-10" />
          </div>
          <h1 className="font-headline text-4xl font-bold tracking-tighter text-center">
            Email Verification
          </h1>
        </div>
        
        <Card className="w-full">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              {status === 'loading' && !token && <Loader2 className="h-5 w-5 animate-spin" />}
              {status === 'loading' && token && <Loader2 className="h-5 w-5 animate-spin" />}
              {status === 'success' && <CheckCircle className="h-5 w-5 text-green-600" />}
              {status === 'error' && <XCircle className="h-5 w-5 text-red-600" />}
              {status === 'loading' && !token && 'Waiting for Email Verification'}
              {status === 'loading' && token && 'Verifying Email...'}
              {status === 'success' && 'Email Verified!'}
              {status === 'error' && 'Verification Failed'}
            </CardTitle>
            <CardDescription>
              {message}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {status === 'success' && (
              <Button onClick={handleContinue} className="w-full">
                Continue to Dashboard
              </Button>
            )}
            {status === 'error' && (
              <Button onClick={() => router.push('/')} variant="outline" className="w-full">
                Back to Login
              </Button>
            )}
            {status === 'loading' && !token && (
              <div className="space-y-4">
                <form onSubmit={handleOtpSubmit} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Enter 6-digit verification code:</label>
                    <Input
                      type="text"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      className="text-center text-lg tracking-widest"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={otp.length !== 6 || isSubmittingOtp}
                  >
                    {isSubmittingOtp ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify Code'}
                  </Button>
                </form>
                <div className="text-center">
                  <Button onClick={() => router.push('/')} variant="outline" className="w-full">
                    Back to Login
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}