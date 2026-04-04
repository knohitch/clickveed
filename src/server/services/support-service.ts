
'use server';

import { auth } from '@/auth';
import prisma from '@/server/prisma';
import { sendEmail } from './email-service';
import { revalidatePath } from 'next/cache';
import { formatDistanceToNow } from 'date-fns';

export interface Message {
    sender: 'user' | 'agent';
    text: string;
    timestamp: string;
}

export type TicketStatus = 'Open' | 'Pending' | 'Resolved';

export interface SupportTicket {
    id: string;
    userId: string | null;
    userName: string;
    userEmail: string;
    userAvatar: string | null;
    subject: string;
    preview: string;
    status: TicketStatus;
    lastUpdate: string;
    conversation: Message[];
    createdAt: Date;
    updatedAt: Date;
}

function isAdminRole(role?: string | null): boolean {
    return !!role && ['ADMIN', 'SUPER_ADMIN'].includes(role);
}

async function requireAuthenticatedSession() {
    const session = await auth();
    if (!session?.user?.id) {
        throw new Error('Unauthorized');
    }
    return session;
}

async function requireAdminSession() {
    const session = await requireAuthenticatedSession();
    if (!isAdminRole(session.user.role)) {
        throw new Error('Administrator access required');
    }
    return session;
}

/**
 * Creates a new support ticket and sends notifications.
 * This is a server-only function.
 */
export async function createTicket(
  data: { subject: string; initialMessage: string }
): Promise<SupportTicket> {
  const session = await requireAuthenticatedSession();

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      displayName: true,
      email: true,
      avatarUrl: true,
    },
  });

  const userName = user?.displayName?.trim() || session.user.name?.trim() || 'User';
  const userEmail = user?.email || session.user.email || '';
  if (!userEmail) {
    throw new Error('Unable to create support ticket without an email address.');
  }

  const subject = data.subject.trim();
  const initialMessage = data.initialMessage.trim();
  if (!subject || !initialMessage) {
    throw new Error('Subject and message are required.');
  }

  const preview =
    initialMessage.length > 100 ? `${initialMessage.substring(0, 100)}...` : initialMessage;

  const newTicketData = {
    userId: session.user.id,
    userName,
    userEmail,
    userAvatar: user?.avatarUrl || session.user.image || null,
    subject,
    preview,
    status: 'Open',
    conversation: [
      {
        sender: 'user' as const,
        text: initialMessage,
        timestamp: new Date().toISOString(),
      },
    ],
  };

  const newTicket = await prisma.supportTicket.create({
    data: newTicketData
  });
  revalidatePath('/kanri/support');
  revalidatePath('/chin/dashboard/support');

  // Send notifications after creating the ticket
  await sendEmail({
    to: userEmail,
    templateKey: 'userNewTicket',
    data: {
      userName,
      ticketId: newTicket.id,
      ticketSubject: subject,
    }
  });

  await sendEmail({
    to: 'admin',
    templateKey: 'adminNewTicket',
    data: {
      userName,
      userEmail,
      ticketId: newTicket.id,
      ticketSubject: subject,
    }
  });

  return {
    ...newTicket,
    status: newTicket.status as TicketStatus,
    lastUpdate: formatDistanceToNow(newTicket.updatedAt, { addSuffix: true }),
    conversation: newTicket.conversation ? (newTicket.conversation as unknown as Message[]) : [],
  };
}

export async function getTickets(): Promise<SupportTicket[]> {
    await requireAdminSession();

    const dbTickets = await prisma.supportTicket.findMany({
        orderBy: { createdAt: 'desc' },
    });

    return dbTickets.map(ticket => ({
        ...ticket,
        status: ticket.status as TicketStatus,
        conversation: ticket.conversation ? (ticket.conversation as unknown as Message[]) : [],
        lastUpdate: formatDistanceToNow(ticket.updatedAt, { addSuffix: true }),
    }))
}

export async function updateTicket(ticketId: string, updates: Partial<SupportTicket>): Promise<SupportTicket> {
    await requireAdminSession();

    const existingTicket = await prisma.supportTicket.findUnique({
        where: { id: ticketId }
    });
    
    if (!existingTicket) {
        throw new Error('Ticket not found');
    }
    
    const updatedTicketDb = await prisma.supportTicket.update({
        where: { id: ticketId },
        data: {
            status: updates.status,
            preview: updates.preview,
            conversation: updates.conversation as any,
        }
    });
    
    revalidatePath('/kanri/support');
    revalidatePath('/chin/dashboard/support');
    
    // Send email notification if status has changed
    if (updates.status && updates.status !== existingTicket.status) {
        await sendEmail({
            to: existingTicket.userEmail,
            templateKey: 'userTicketStatusChange',
            data: {
                userName: existingTicket.userName,
                ticketId: ticketId,
                newStatus: updates.status,
            }
        });
    }
    
    // Send email notification if a new message has been added
    const existingConversation = existingTicket.conversation ? (existingTicket.conversation as unknown as Message[]) : [];
    const updatedConversation = updates.conversation || [];
    
    if (updatedConversation.length > existingConversation.length) {
        const lastMessage = updatedConversation[updatedConversation.length - 1];
        if (lastMessage.sender === 'agent') {
            await sendEmail({
                to: existingTicket.userEmail,
                templateKey: 'userTicketReply',
                data: {
                    userName: existingTicket.userName,
                    ticketId: ticketId,
                    ticketSubject: existingTicket.subject,
                    replyMessage: lastMessage.text,
                }
            });
        }
    }

    return {
        ...updatedTicketDb,
        status: updatedTicketDb.status as TicketStatus,
        conversation: updatedTicketDb.conversation ? (updatedTicketDb.conversation as unknown as Message[]) : [],
        lastUpdate: formatDistanceToNow(updatedTicketDb.updatedAt, { addSuffix: true }),
    };
}
