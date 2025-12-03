
'use server';

import type { UserRole, UserStatus, UserWithRole } from '@/server/actions/user-actions';
import { getUsers as getUsersFromServer, createPendingAdminUser as createPendingAdminUserServer } from '@/server/actions/user-actions';
import { createTicket as createTicketServer } from '@/server/services/support-service';
import { updateTicket as updateTicketServer } from '@/server/services/support-service';
import { getTickets as getTicketsServer } from '@/server/services/support-service';
import type { SupportTicket as SupportTicketType, Message, TicketStatus } from '@/server/services/support-service';

export type { UserRole, UserStatus, UserWithRole, Message, TicketStatus };
export type SupportTicket = SupportTicketType;

export async function getUsers(): Promise<UserWithRole[]> {
    return getUsersFromServer();
}

export async function createPendingAdminUser(userData: { fullName: string; email: string; role?: 'Admin' | 'User' }): Promise<UserWithRole> {
    return createPendingAdminUserServer(userData);
}

export async function getTickets(): Promise<SupportTicket[]> {
    return getTicketsServer();
}

export async function createTicket(data: Omit<SupportTicket, 'id' | 'status' | 'lastUpdate' | 'preview' | 'conversation' | 'createdAt' | 'updatedAt' | 'userId'> & { initialMessage: string }): Promise<SupportTicket> {
    return createTicketServer(data);
}

export async function updateTicket(ticketId: string, updates: Partial<SupportTicket>): Promise<SupportTicket> {
    return updateTicketServer(ticketId, updates);
}
