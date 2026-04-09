import { NextResponse } from 'next/server';

import { loginWithCredentials } from '@/server/services/auth-login-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type LoginPayload = {
  email?: string;
  password?: string;
};

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let payload: LoginPayload = {};

    if (contentType.includes('application/json')) {
      payload = await request.json();
    } else {
      const formData = await request.formData();
      payload = {
        email: String(formData.get('email') || ''),
        password: String(formData.get('password') || ''),
      };
    }

    const result = await loginWithCredentials({
      email: payload.email,
      password: payload.password,
    });

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      {
        error: 'Invalid login request payload.',
        success: false,
      },
      { status: 400 }
    );
  }
}
