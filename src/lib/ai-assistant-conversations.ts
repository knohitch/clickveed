'use server';

import { auth } from '@/auth';
import type { Message } from '@/lib/types';
import prisma, { withRetry } from '@/server/prisma';

export type AiAssistantConversation = {
  id: string;
  title: string;
  updatedAt: number;
  messages: Message[];
};

type ConversationInput = {
  id?: string;
  title?: string;
  messages?: Message[];
  updatedAt?: number;
};

function normalizeMessageRole(role: unknown): 'user' | 'model' {
  if (role === 'assistant') return 'model';
  return role === 'user' ? 'user' : 'model';
}

function sanitizeMessages(messages: unknown): Message[] {
  if (!Array.isArray(messages)) return [];

  return messages
    .map((message, index) => {
      const candidate = message as Partial<Message> | null | undefined;
      const content = typeof candidate?.content === 'string' ? candidate.content : '';
      if (!content.trim()) return null;

      const id =
        typeof candidate?.id === 'string' && candidate.id.trim()
          ? candidate.id
          : `msg-${Date.now()}-${index}`;

      return {
        id,
        role: normalizeMessageRole(candidate?.role),
        content,
      } satisfies Message;
    })
    .filter((message): message is Message => !!message);
}

function resolveConversationTitle(rawTitle: unknown, messages: Message[]): string {
  if (typeof rawTitle === 'string' && rawTitle.trim()) {
    return rawTitle.trim().slice(0, 120);
  }

  const firstUserMessage = messages.find((message) => message.role === 'user');
  if (firstUserMessage?.content) {
    return firstUserMessage.content.trim().slice(0, 120) || 'New chat';
  }

  return 'New chat';
}

function toClientConversation(record: any): AiAssistantConversation {
  return {
    id: String(record.id),
    title: String(record.title || 'New chat'),
    updatedAt: new Date(record.updatedAt).getTime(),
    messages: sanitizeMessages(record.messages),
  };
}

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Authentication required');
  }
  return session.user.id;
}

export async function getAiAssistantConversations(): Promise<AiAssistantConversation[]> {
  const userId = await requireUserId();
  const rows = await withRetry<any[]>(
    () =>
      (prisma as any).aiAssistantConversation.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
      }),
    { operationName: 'aiAssistantConversation.findMany' }
  );

  return rows.map(toClientConversation);
}

export async function createAiAssistantConversation(input: ConversationInput = {}): Promise<AiAssistantConversation> {
  const userId = await requireUserId();
  const messages = sanitizeMessages(input.messages);
  const title = resolveConversationTitle(input.title, messages);
  const timestamp = typeof input.updatedAt === 'number' ? new Date(input.updatedAt) : undefined;

  const created = await withRetry(
    () =>
      (prisma as any).aiAssistantConversation.create({
        data: {
          ...(typeof input.id === 'string' && input.id.trim() ? { id: input.id.trim() } : {}),
          title,
          messages,
          userId,
          ...(timestamp ? { createdAt: timestamp, updatedAt: timestamp } : {}),
        },
      }),
    { operationName: 'aiAssistantConversation.create' }
  );

  return toClientConversation(created);
}

export async function saveAiAssistantConversation(input: ConversationInput): Promise<AiAssistantConversation> {
  const userId = await requireUserId();
  if (!input.id || !input.id.trim()) {
    throw new Error('Conversation id is required.');
  }

  const messages = sanitizeMessages(input.messages);
  const title = resolveConversationTitle(input.title, messages);
  const conversationId = input.id.trim();

  const existing = await withRetry(
    () =>
      (prisma as any).aiAssistantConversation.findFirst({
        where: {
          id: conversationId,
          userId,
        },
      }),
    { operationName: 'aiAssistantConversation.findFirst(save)' }
  );

  if (!existing) {
    const created = await withRetry(
      () =>
        (prisma as any).aiAssistantConversation.create({
          data: {
            id: conversationId,
            title,
            messages,
            userId,
          },
        }),
      { operationName: 'aiAssistantConversation.create(save)' }
    );
    return toClientConversation(created);
  }

  const updated = await withRetry(
    () =>
      (prisma as any).aiAssistantConversation.update({
        where: { id: conversationId },
        data: {
          title,
          messages,
        },
      }),
    { operationName: 'aiAssistantConversation.update' }
  );

  return toClientConversation(updated);
}

export async function importAiAssistantConversations(input: { conversations: ConversationInput[] }): Promise<AiAssistantConversation[]> {
  const userId = await requireUserId();
  const conversations = Array.isArray(input?.conversations) ? input.conversations : [];

  for (const entry of conversations) {
    const messages = sanitizeMessages(entry.messages);
    const title = resolveConversationTitle(entry.title, messages);
    const timestamp = typeof entry.updatedAt === 'number' ? new Date(entry.updatedAt) : new Date();

    await withRetry(
      () =>
        (prisma as any).aiAssistantConversation.create({
          data: {
            title,
            messages,
            userId,
            createdAt: timestamp,
            updatedAt: timestamp,
          },
        }),
      { operationName: 'aiAssistantConversation.create(import)' }
    );
  }

  const rows = await withRetry<any[]>(
    () =>
      (prisma as any).aiAssistantConversation.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
      }),
    { operationName: 'aiAssistantConversation.findMany(import)' }
  );

  return rows.map(toClientConversation);
}
