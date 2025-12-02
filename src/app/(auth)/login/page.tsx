
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Check } from 'lucide-react';
import { Logo } from '@/components/logo';
import { Separator } from '@/components/ui/separator';
import { GoogleIcon } from '@/components/icons/google-icon';
import { LoginForm } from '@/components/auth/login-form';
import { getAdminSettings } from '@/server/actions/admin-actions';

export async function generateMetadata() {
  const { appName } = await getAdminSettings();
  return {
    title: `Login | ${appName}`,
  };
}

export default async function LoginPage() {
  return (
    <main className="w-full lg:grid lg:min-h-screen lg:grid-cols-2 xl:min-h-screen">
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto grid w-full max-w-md gap-6">
          <div className="grid gap-2 text-center">
            <div className="flex justify-center">
              <Logo size="large" />
            </div>
            <h1 className="text-3xl font-bold mt-4">Welcome Back</h1>
            <p className="text-balance text-base text-muted-foreground">
              Sign in to continue to your workspace.
            </p>
          </div>

          <LoginForm />

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
                <Button variant="outline" className="w-full text-lg py-6" type="submit">
                    <GoogleIcon className="mr-3 h-6 w-6" />
                    Continue with Google
                </Button>
            </form>

          <div className="mt-4 text-center text-sm">
            Don't have an account?{' '}
            <Link href="/signup" className="underline">
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
              Create Stunning Videos in Minutes
            </CardTitle>
            <CardDescription className="text-base animate-fade-in-up [animation-delay:300ms]">
              Let AI be your creative partner. From scripts to final cuts,
              we&apos;ve got you covered.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-lg">
            <ul className="space-y-3">
              <li className="flex items-center gap-3 animate-fade-in-up [animation-delay:400ms]">
                <Check className="text-primary h-6 w-6" />
                <span className="font-medium">AI-Powered Scripting</span>
              </li>
              <li className="flex items-center gap-3 animate-fade-in-up [animation-delay:500ms]">
                <Check className="text-primary h-6 w-6" />
                <span className="font-medium">Image-to-Video Creation</span>
              </li>
              <li className="flex items-center gap-3 animate-fade-in-up [animation-delay:600ms]">
                <Check className="text-primary h-6 w-6" />
                <span className="font-medium">Instant Voiceovers</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
