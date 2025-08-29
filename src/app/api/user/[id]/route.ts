
import { NextResponse } from 'next/server';
import prisma from '@/server/prisma';
import { auth } from '@/auth';

export async function GET(request: Request, { params }: { params: { id: string } }) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // An admin can view any user's profile. A regular user can only view their own.
    if (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'ADMIN' && session.user.id !== params.id) {
         return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const userId = params.id;
    
    if (!userId) {
        return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    try {
        const user = await prisma.user.findUnique({
            where: {
                id: userId,
            },
            include: {
                plan: true,
                usage: true
            }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        
        // Don't expose sensitive fields
        const { passwordHash, passwordResetToken, passwordResetExpires, ...safeUserData } = user;

        return NextResponse.json(safeUserData);
    } catch (error) {
        console.error(`Failed to fetch user ${userId}:`, error);
        return NextResponse.json({ error: 'Failed to fetch user data' }, { status: 500 });
    }
}


export async function PATCH(request: Request, { params }: { params: { id: string } }) {
    const session = await auth();
    if (!session?.user || session.user.id !== params.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = params.id;
    const body = await request.json();

    try {
        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                name: body.name,
                // Add other updatable fields here as needed
            },
        });

        const { passwordHash, ...safeUserData } = user;
        return NextResponse.json(safeUserData);

    } catch (error) {
        console.error(`Failed to update user ${userId}:`, error);
        return NextResponse.json({ error: 'Failed to update user data' }, { status: 500 });
    }
}
