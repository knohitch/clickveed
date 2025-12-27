import { NextResponse } from 'next/server';
import prisma from '@/server/prisma';
import { auth } from '@/auth';

export async function GET() {
  try {
    // Check current user session
    const session = await auth();
    
    // Get all users with their display names
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        status: true,
      }
    });
    
    return NextResponse.json({
      session: session?.user || null,
      users: users.map(user => ({
        ...user,
        hasDisplayName: !!user.displayName,
        displayNameLength: user.displayName ? user.displayName.length : 0
      }))
    });
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({ error: 'Failed to fetch debug data' }, { status: 500 });
  }
}
