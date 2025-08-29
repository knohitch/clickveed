import { NextResponse } from 'next/server';
import prisma from '@/server/prisma';

export async function GET() {
  try {
    const count = await prisma.user.count();
    return NextResponse.json({ count }, { status: 200 });
  } catch (error) {
    console.error('Error counting users:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
