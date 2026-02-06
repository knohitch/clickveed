'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
import { useToast } from '@/hooks/use-toast';

export default function ChinSignUpPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });

  // Check if there are any existing users
  useEffect(() => {
    const checkUsers = async () => {
      try {
        const response = await fetch('/api/user/count');
        const data = await response.json();
        
        // If there are existing users, redirect to login
        if (data.count > 0) {
          router.push('/chin/login');
        }
      } catch (err) {
        console.error('Error checking user count:', err);
        // In case of database error, we'll assume no users exist for demo purposes
        // This is just for demonstration - in a real app you'd handle this better
      }
    };
    
    checkUsers();
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/chin-signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        toast({
          title: 'Account Created',
          description: 'Your Super Admin account has been created successfully.',
        });
        // Redirect to chin dashboard after a short delay
        setTimeout(() => {
          router.push('/chin/dashboard');
        }, 2000);
      } else {
        setError(data.error || 'An error occurred during signup.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <main className="w-full lg:grid lg:min-h-screen lg:grid-cols-2 xl:min-h-screen">
        <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto grid w-full max-w-md gap-6">
            <Alert>
              <Check className="h-4 w-4" />
              <AlertTitle>Account Created Successfully!</AlertTitle>
              <AlertDescription>
                Your Super Admin account has been created. Redirecting to dashboard...
              </AlertDescription>
            </Alert>
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

  return (
    <main className="w-full lg:grid lg:min-h-screen lg:grid-cols-2 xl:min-h-screen">
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto grid w-full max-w-md gap-6">
          <div className="grid gap-2 text-center">
            <div className="flex justify-center">
              <Logo size="large" />
            </div>
            <h1 className="text-3xl font-bold mt-4">Create Super Admin Account</h1>
            <p className="text-balance text-base text-muted-foreground">
              This is for the first Super Admin user only.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="Admin User"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
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
                minLength={6}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Sign Up Failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full text-lg py-6" disabled={isLoading}>
              {isLoading ? 'Creating Account...' : 'Create Super Admin Account'}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            Already have an account?{' '}
            <Link href="/chin/login" className="underline">
              Sign in
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
