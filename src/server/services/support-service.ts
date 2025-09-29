
'use server';

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


/**
 * Creates a new support ticket and sends notifications.
 * This is a server-only function.
 */
export async function createTicket(
  data: Omit<SupportTicket, 'id' | 'status' | 'lastUpdate' | 'preview' | 'conversation' | 'createdAt' | 'updatedAt' | 'userId'> & { initialMessage: string }
): Promise<SupportTicket> {

  const newTicketData = {
    userName: data.userName,
    userEmail: data.userEmail,
    userAvatar: data.userAvatar,
    subject: data.subject,
    preview: data.initialMessage.substring(0, 100) + '...',
    status: 'Open',
    conversation: [
      {
        sender: 'user' as const,
        text: data.initialMessage,
        timestamp: new Date().toISOString(),
      },
    ],
    // In a real DB schema, you'd associate this with a user ID.
  };

  const newTicket = await prisma.supportTicket.create({
    data: newTicketData
  });
  revalidatePath('/kanri/support');
  revalidatePath('/chin/dashboard/support');

  // Send notifications after creating the ticket
  await sendEmail({
    to: data.userEmail,
    templateKey: 'userNewTicket',
    data: {
      userName: data.userName,
      ticketId: newTicket.id,
      ticketSubject: data.subject,
    }
  });

  await sendEmail({
    to: 'admin',
    templateKey: 'adminNewTicket',
    data: {
      userName: data.userName,
      userEmail: data.userEmail,
      ticketId: newTicket.id,
      ticketSubject: data.subject,
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
