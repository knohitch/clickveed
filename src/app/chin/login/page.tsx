'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Check, AlertCircle } from 'lucide-react';
import { Logo } from '@/components/logo';
import { Separator } from '@/components/ui/separator';
import { GoogleIcon } from '@/components/icons/google-icon';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

export default function ChinLoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // In a real application, this would connect to your authentication system
    // For demo purposes, we'll just show a success message
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: 'Login Attempt',
        description: 'In a real application, this would authenticate with the database.',
      });
      // For demo purposes, we'll redirect to the dashboard
      router.push('/chin/dashboard');
    }, 1000);
  };

  return (
    <main className="w-full lg:grid lg:min-h-screen lg:grid-cols-2 xl:min-h-screen">
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto grid w-full max-w-md gap-6">
          <div className="grid gap-2 text-center">
            <div className="flex justify-center">
              <Logo size="large" />
            </div>
            <h1 className="text-3xl font-bold mt-4">Super Admin Login</h1>
            <p className="text-balance text-base text-muted-foreground">
              Sign in to access the Super Admin dashboard.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="admin@example.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Login Failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full text-lg py-6" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <form action="/api/auth/signin/google" method="POST">
            <Button variant="outline" className="w-full text-lg py-6" type="submit" disabled>
              <GoogleIcon className="mr-3 h-6 w-6" />
              Continue with Google
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            Don't have an account?{' '}
            <Link href="/chin/signup" className="underline">
              Sign up
            </Link>
          </div>
        </div>
      </div>
      <div className="hidden bg-muted lg:flex items-center justify-center p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-background -z-10" />
        <div className="absolute size-96 rounded-full bg-primary/20 blur-3xl -top-16 -left-16" />
        <div className="absolute size-96 rounded-full bg-primary/10 blur-3xl -bottom-16 -right-16" />

        <Card className="max-w-md w-full glass-card animate-fade-in-up">
          <CardHeader>
            <CardTitle className="text-3xl font-bold animate-fade-in-up [animation-delay:200ms]">
              Platform Administration
            </CardTitle>
            <CardDescription className="text-base animate-fade-in-up [animation-delay:300ms]">
              Manage user accounts, monitor system performance, and configure platform settings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-lg">
            <ul className="space-y-3">
              <li className="flex items-center gap-3 animate-fade-in-up [animation-delay:400ms]">
                <Check className="text-primary h-6 w-6" />
                <span className="font-medium">User Management</span>
              </li>
              <li className="flex items-center gap-3 animate-fade-in-up [animation-delay:500ms]">
                <Check className="text-primary h-6 w-6" />
                <span className="font-medium">System Monitoring</span>
              </li>
              <li className="flex items-center gap-3 animate-fade-in-up [animation-delay:600ms]">
                <Check className="text-primary h-6 w-6" />
                <span className="font-medium">Platform Configuration</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
