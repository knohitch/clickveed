
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
    userAvatar: string;
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
        displayName: user.name,
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
            name: userData.fullName,
            email: userData.email,
            role: userData.role || 'Admin',
            status: 'Pending',
        }
    });

    return {
        uid: newUser.id,
        displayName: newUser.name,
        email: newUser.email,
        role: newUser.role as UserRole,
        status: newUser.status as UserStatus,
        plan: 'Free'
    };
}


// --- Ticket Actions (To be migrated to Prisma) ---
const mockTickets: SupportTicket[] = [
    {
        id: 'TKT-001',
        userName: 'Alice Johnson',
        userEmail: 'alice@example.com',
        userAvatar: 'https://placehold.co/40x40.png',
        subject: 'Problem with video export',
        preview: 'Hi, I was trying to export my video but it keeps failing at 99%...',
        status: 'Open',
        lastUpdate: '15m ago',
        conversation: [
            { sender: 'user', text: 'Hi, I was trying to export my video but it keeps failing at 99%. Can you help?', timestamp: '10:30 AM' },
        ]
    },
     {
        id: 'TKT-002',
        userName: 'Bob Williams',
        userEmail: 'bob@example.com',
        userAvatar: 'https://placehold.co/40x40.png',
        subject: 'Billing question',
        preview: 'I have a question about my last invoice. I was charged twice...',
        status: 'Open',
        lastUpdate: '45m ago',
        conversation: [
             { sender: 'user', text: 'I have a question about my last invoice. I was charged twice and I need a refund for one of them.', timestamp: '9:45 AM' },
        ]
    },
];

export async function getTickets(): Promise<SupportTicket[]> {
    return JSON.parse(JSON.stringify(mockTickets.sort((a,b) => a.id < b.id ? 1 : -1)));
}

export async function createTicket(data: Omit<SupportTicket, 'id' | 'status' | 'lastUpdate' | 'preview' | 'conversation'> & { initialMessage: string }): Promise<SupportTicket> {
    const newTicket: SupportTicket = {
        id: `TKT-${String(Date.now()).slice(-6)}`,
        ...data,
        status: 'Open',
        lastUpdate: 'Just now',
        preview: data.initialMessage.substring(0, 100) + '...',
        conversation: [
            {
                sender: 'user',
                text: data.initialMessage,
                timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            }
        ]
    };
    mockTickets.push(newTicket);
    
    console.log(`Email Sent: New support ticket ${newTicket.id} created by ${data.userName}.`);
    
    return newTicket;
}

export async function updateTicket(ticketId: string, updates: Partial<SupportTicket>): Promise<SupportTicket> {
    const ticketIndex = mockTickets.findIndex(t => t.id === ticketId);
    if (ticketIndex === -1) {
        throw new Error("Ticket not found");
    }
    
    const updatedTicket = { ...mockTickets[ticketIndex], ...updates };
    mockTickets[ticketIndex] = updatedTicket;
    
    return updatedTicket;
}
