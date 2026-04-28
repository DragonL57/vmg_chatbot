import { Message, ChatSession } from "../../types/chat";

export interface Conversation {
  id: string;
  title: string;
  isStarred: boolean;
  updatedAt: Date;
}

export interface ConversationPayload {
  id: string;
  userId: string;
  title?: string;
  messages: Message[];
  locationCoords?: any;
  locationAddress?: string;
  tokenUsage?: any;
  messageCount?: number;
  updatedAt?: Date;
}

export interface IChatRepository {
  listByUser(userId: string): Promise<Conversation[]>;
  getById(id: string, userId: string): Promise<ChatSession | null>;
  upsert(conversation: ConversationPayload): Promise<void>;
  delete(id: string, userId: string): Promise<void>;
  star(id: string, userId: string, isStarred: boolean): Promise<void>;
  rename(id: string, userId: string, title: string): Promise<void>;
}
