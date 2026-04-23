import { db } from '../db';
import { conversations, knowledgeFiles, knowledgeCollections, reports, users } from '../db/schema';
import { eq, desc, asc, sql } from 'drizzle-orm';

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface ConversationMessage {
  role: string;
  content: string;
  timestamp?: string;
}

export interface ConversationPayload {
  id: string;
  userId?: string;
  title?: string;
  messages: ConversationMessage[];
  location_coords?: {
    latitude: number;
    longitude: number;
    accuracy: number | null;
  };
  location_address?: string;
  token_usage?: TokenUsage;
  message_count: number;
  updated_at: string;
}

export async function upsertConversation(payload: ConversationPayload) {
  // Try to find our internal userId from supabaseId if userId is a supabaseId
  let internalUserId = payload.userId;
  if (payload.userId && payload.userId.length > 30) { // likely a UUID from supabase
     const [user] = await db.select({ id: users.id }).from(users).where(eq(users.supabaseId, payload.userId));
     if (user) internalUserId = user.id;
  }

  return await db.insert(conversations)
    .values({
      id: payload.id,
      userId: internalUserId,
      title: payload.title || (payload.messages[0]?.content?.slice(0, 40) + (payload.messages[0]?.content?.length > 40 ? '...' : '')),
      messages: payload.messages,
      locationCoords: payload.location_coords,
      locationAddress: payload.location_address,
      tokenUsage: payload.token_usage,
      messageCount: payload.message_count,
      updatedAt: new Date(payload.updated_at),
    })
    .onConflictDoUpdate({
      target: conversations.id,
      set: {
        userId: internalUserId,
        title: payload.title,
        messages: payload.messages,
        locationCoords: payload.location_coords,
        locationAddress: payload.location_address,
        tokenUsage: payload.token_usage,
        messageCount: payload.message_count,
        updatedAt: new Date(payload.updated_at),
      }
    });
}

export async function getConversationById(id: string) {
  const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
  return conversation;
}

export async function listConversationsByUser(supabaseId: string) {
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.supabaseId, supabaseId));
  if (!user) return [];

  return await db.select({
    id: conversations.id,
    title: conversations.title,
    isStarred: conversations.isStarred,
    updatedAt: conversations.updatedAt,
  })
  .from(conversations)
  .where(eq(conversations.userId, user.id))
  .orderBy(desc(conversations.isStarred), desc(conversations.updatedAt));
}

export async function deleteConversation(id: string) {
  return await db.delete(conversations).where(eq(conversations.id, id));
}

export async function starConversation(id: string, isStarred: boolean) {
  return await db.update(conversations)
    .set({ 
      isStarred: isStarred ? 1 : 0,
      updatedAt: new Date() // Refresh recency on star/unstar
    })
    .where(eq(conversations.id, id));
}

export async function renameConversation(id: string, title: string) {
  return await db.update(conversations)
    .set({ title })
    .where(eq(conversations.id, id));
}

export interface KnowledgeFile {
  id: string;
  filename: string;
  sourceUrl: string | null;
  status: 'pending' | 'indexing' | 'completed' | 'failed';
  errorMessage: string | null;
  mode: string;
  folder: string | null;
  progress: number | null;
  summary: string | null;
  logs: string[] | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export async function listKnowledgeFiles(): Promise<KnowledgeFile[]> {
  try {
    return await db.select().from(knowledgeFiles).orderBy(desc(knowledgeFiles.createdAt)) as KnowledgeFile[];
  } catch (error) {
    console.error('[SupabaseService] listKnowledgeFiles error:', error);
    throw error;
  }
}

export async function upsertKnowledgeFile(payload: any) {
  const result = await db.insert(knowledgeFiles)
    .values({
      id: payload.id,
      filename: payload.filename,
      sourceUrl: payload.sourceUrl ?? payload.source_url,
      status: payload.status,
      errorMessage: payload.errorMessage ?? payload.error_message,
      mode: payload.mode,
      folder: payload.folder,
      progress: payload.progress,
      summary: payload.summary,
      logs: payload.logs,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: knowledgeFiles.filename,
      set: {
        status: payload.status,
        errorMessage: payload.errorMessage ?? payload.error_message,
        mode: payload.mode,
        folder: payload.folder,
        progress: payload.progress,
        summary: payload.summary,
        logs: payload.logs,
        updatedAt: new Date(),
      }
    })
    .returning();
  
  return result[0] as KnowledgeFile;
}

export async function deleteKnowledgeFile(id: string) {
  return await db.delete(knowledgeFiles).where(eq(knowledgeFiles.id, id));
}

export interface KnowledgeCollection {
  id: string;
  name: string;
  qdrantName: string;
  description: string | null;
  allowedRoles: string[] | null;
  createdAt: Date | null;
}

export async function listCollections(): Promise<KnowledgeCollection[]> {
  try {
    return await db.select().from(knowledgeCollections).orderBy(asc(knowledgeCollections.createdAt)) as unknown as KnowledgeCollection[];
  } catch (error) {
    console.error('[SupabaseService] listCollections error:', error);
    throw error;
  }
}

export async function createCollectionRecord(payload: any) {
  const result = await db.insert(knowledgeCollections)
    .values({
      name: payload.name,
      qdrantName: payload.qdrant_name ?? payload.qdrantName,
      description: payload.description,
      allowedRoles: payload.allowedRoles ?? payload.allowed_roles ?? ["admin", "staff", "user"],
    })
    .onConflictDoUpdate({
      target: knowledgeCollections.name,
      set: {
        qdrantName: payload.qdrant_name ?? payload.qdrantName,
        description: payload.description,
        allowedRoles: payload.allowedRoles ?? payload.allowed_roles ?? ["admin", "staff", "user"],
      }
    })
    .returning();
  
  return result[0] as unknown as KnowledgeCollection;
}

export async function deleteCollectionRecord(id: string) {
  return await db.delete(knowledgeCollections).where(eq(knowledgeCollections.id, id));
}

export interface Report {
  id: string;
  reportedMessage: string;
  conversation: any;
  note: string | null;
  sessionId: string | null;
  createdAt: Date | null;
}

export async function listReports(): Promise<Report[]> {
  return await db.select().from(reports).orderBy(desc(reports.createdAt)) as Report[];
}

export async function updateCollectionRecord(id: string, data: Partial<KnowledgeCollection>) {
  return await db.update(knowledgeCollections)
    .set(data)
    .where(eq(knowledgeCollections.id, id));
}

export async function updateKnowledgeFileRecord(id: string, data: Partial<KnowledgeFile>) {
  return await db.update(knowledgeFiles)
    .set(data)
    .where(eq(knowledgeFiles.id, id));
}
