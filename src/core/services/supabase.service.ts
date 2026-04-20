import { db } from '../db';
import { conversations, knowledgeFiles, knowledgeCollections } from '../db/schema';
import { eq, desc, asc } from 'drizzle-orm';

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
  return await db.insert(conversations)
    .values({
      id: payload.id,
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
        messages: payload.messages,
        locationCoords: payload.location_coords,
        locationAddress: payload.location_address,
        tokenUsage: payload.token_usage,
        messageCount: payload.message_count,
        updatedAt: new Date(payload.updated_at),
      }
    });
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
  return await db.query.knowledgeFiles.findMany({
    orderBy: [desc(knowledgeFiles.createdAt)]
  }) as KnowledgeFile[];
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
  createdAt: Date | null;
}

export async function listCollections(): Promise<KnowledgeCollection[]> {
  return await db.query.knowledgeCollections.findMany({
    orderBy: [asc(knowledgeCollections.createdAt)]
  }) as KnowledgeCollection[];
}

export async function createCollectionRecord(payload: any) {
  const result = await db.insert(knowledgeCollections)
    .values({
      name: payload.name,
      qdrantName: payload.qdrant_name ?? payload.qdrantName,
      description: payload.description,
    })
    .onConflictDoUpdate({
      target: knowledgeCollections.name,
      set: {
        qdrantName: payload.qdrant_name ?? payload.qdrantName,
        description: payload.description,
      }
    })
    .returning();
  
  return result[0] as KnowledgeCollection;
}

export async function deleteCollectionRecord(id: string) {
  return await db.delete(knowledgeCollections).where(eq(knowledgeCollections.id, id));
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
