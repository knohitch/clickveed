

import { z } from "zod";

export const HistorySchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string(),
});

export const CreativeAssistantChatSchema = z.object({
  history: z.array(HistorySchema).optional(),
  message: z.string(),
});

export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
}

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'USER';
export type UserStatus = 'Active' | 'Pending';

export type CreativeAssistantChatRequest = z.infer<typeof CreativeAssistantChatSchema>;
