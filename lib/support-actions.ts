
'use server';

import type { User } from 'firebase/auth';
import prisma from './prisma';

export type UserRole = 'Super Admin' | 'Admin' | 'User';
export type UserStatus = 'Active' | 'Pending';

export type UserWithRole = Partial<User> & {
    role: UserRole;
    status: UserStatus;
    plan?: string;
};

export interface Message {
    sender: 'user' | 'agent';
    text: string;
    timestamp: string;
}

export type TicketStatus = 'Open' | 'Pending' | 'Resolved';

export interface SupportTicket {
    id: string;
    userName: string;
    userEmail: string;
    userAvatar: string | null;
    subject: string;
    preview: string;
    status: TicketStatus;
    lastUpdate: string;
    conversation: Message[];
}

// --- User Actions ---
export async function getUsers(): Promise<UserWithRole[]> {
    const users = await prisma.user.findMany({
        include: {
            plan: true
        }
    });

    return users.map(user => ({
        uid: user.id,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.avatarUrl,
        emailVerified: user.emailVerified ?? false,
        role: user.role as UserRole,
        status: user.status as UserStatus,
        plan: user.plan?.name || 'Free'
    }));
}

export async function createPendingAdminUser(userData: { fullName: string; email: string; password?: string, role?: 'Admin' | 'User' }): Promise<UserWithRole> {
    const existingUser = await prisma.user.findUnique({
        where: { email: userData.email },
    });
    
    if (existingUser) {
        throw new Error("An account with this email already exists.");
    }
    
    // In a real app, you would hash the password here before saving
    const newUser = await prisma.user.create({
        data: {
            displayName: userData.fullName,
            email: userData.email,
            role: userData.role || 'Admin',
            status: 'Pending',
        }
    });

    return {
        uid: newUser.id,
        displayName: newUser.displayName,
        email: newUser.email,
        role: newUser.role as UserRole,
        status: newUser.status as UserStatus,
        plan: 'Free'
    };
}


export async function getTickets(): Promise<SupportTicket[]> {
    const tickets = await prisma.supportTicket.findMany({
        orderBy: {
            createdAt: 'desc'
        }
    });

    return tickets.map(ticket => ({
        id: ticket.id,
        userName: ticket.userName,
        userEmail: ticket.userEmail,
        userAvatar: ticket.userAvatar || '',
        subject: ticket.subject,
        preview: ticket.preview,
        status: ticket.status as TicketStatus,
        lastUpdate: getTimeAgo(ticket.updatedAt),
        conversation: Array.isArray(ticket.conversation) ? ticket.conversation : JSON.parse(JSON.stringify(ticket.conversation))
    }));
}

// Helper function to format time ago
function getTimeAgo(date: Date): string {
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / 60000);
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
}

export async function createTicket(data: Omit<SupportTicket, 'id' | 'status' | 'lastUpdate' | 'preview' | 'conversation'> & { initialMessage: string }): Promise<SupportTicket> {
    const newTicket = await prisma.supportTicket.create({
        data: {
            userName: data.userName,
            userEmail: data.userEmail,
            userAvatar: data.userAvatar,
            subject: data.subject,
            preview: data.initialMessage.substring(0, 100) + '...',
            status: 'Open',
            conversation: [
                {
                    sender: 'user',
                    text: data.initialMessage,
                    timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                }
            ]
        }
    });
    
    console.log(`Email Sent: New support ticket ${newTicket.id} created by ${data.userName}.`);
    
    return {
        id: newTicket.id,
        userName: newTicket.userName,
        userEmail: newTicket.userEmail,
        userAvatar: newTicket.userAvatar || '',
        subject: newTicket.subject,
        preview: newTicket.preview,
        status: newTicket.status as TicketStatus,
        lastUpdate: 'Just now',
        conversation: Array.isArray(newTicket.conversation) ? newTicket.conversation : JSON.parse(JSON.stringify(newTicket.conversation))
    };
}

export async function updateTicket(ticketId: string, updates: Partial<SupportTicket>): Promise<SupportTicket> {
    // Prepare the data for Prisma update
    const updateData: any = {};
    
    if (updates.status) updateData.status = updates.status;
    if (updates.preview) updateData.preview = updates.preview;
    if (updates.conversation) updateData.conversation = updates.conversation;
    
    const updatedTicket = await prisma.supportTicket.update({
        where: { id: ticketId },
        data: updateData
    });
    
    return {
        id: updatedTicket.id,
        userName: updatedTicket.userName,
        userEmail: updatedTicket.userEmail,
        userAvatar: updatedTicket.userAvatar || '',
        subject: updatedTicket.subject,
        preview: updatedTicket.preview,
        status: updatedTicket.status as TicketStatus,
        lastUpdate: getTimeAgo(updatedTicket.updatedAt),
        conversation: Array.isArray(updatedTicket.conversation) ? updatedTicket.conversation : JSON.parse(JSON.stringify(updatedTicket.conversation))
    };
}
