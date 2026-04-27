import { IKnowledgeRepositoryPort, KnowledgeFile, KnowledgeCollection } from "../../application/ports/knowledge-repository.port";
import { db } from "../../db";
import { knowledgeFiles, knowledgeCollections } from "../../db/schema";
import { eq, desc, asc } from "drizzle-orm";

export class DrizzleKnowledgeRepositoryAdapter implements IKnowledgeRepositoryPort {
  async listFiles(): Promise<KnowledgeFile[]> {
    const results = await db.select().from(knowledgeFiles).orderBy(desc(knowledgeFiles.createdAt));
    return results.map(r => ({
      id: r.id,
      filename: r.filename,
      mode: r.mode,
      status: r.status as any,
      progress: r.progress || 0,
      summary: r.summary || undefined,
      logs: (r.logs as string[]) || []
    }));
  }

  async upsertFile(file: Partial<KnowledgeFile> & { id: string }): Promise<void> {
    await db.insert(knowledgeFiles).values({
      id: file.id,
      filename: file.filename!,
      mode: file.mode!,
      status: file.status,
      progress: file.progress,
      summary: file.summary,
      logs: file.logs,
      updatedAt: new Date(),
    }).onConflictDoUpdate({
      target: knowledgeFiles.id,
      set: {
        status: file.status,
        progress: file.progress,
        summary: file.summary,
        logs: file.logs,
        updatedAt: new Date()
      }
    });
  }

  async deleteFile(id: string): Promise<void> {
    await db.delete(knowledgeFiles).where(eq(knowledgeFiles.id, id));
  }

  async listCollections(): Promise<KnowledgeCollection[]> {
    const results = await db.select().from(knowledgeCollections).orderBy(asc(knowledgeCollections.createdAt));
    return results.map(r => ({
      id: r.id,
      name: r.name,
      qdrantName: r.qdrantName,
      description: r.description || undefined
    }));
  }

  async createCollection(data: Omit<KnowledgeCollection, 'id'>): Promise<KnowledgeCollection> {
    const [result] = await db.insert(knowledgeCollections).values({
      name: data.name,
      qdrantName: data.qdrantName,
      description: data.description,
    }).onConflictDoUpdate({
      target: knowledgeCollections.name,
      set: {
        qdrantName: data.qdrantName,
        description: data.description,
      }
    }).returning();

    return {
      id: result.id,
      name: result.name,
      qdrantName: result.qdrantName,
      description: result.description || undefined
    };
  }

  async updateCollection(id: string, data: Partial<KnowledgeCollection>): Promise<void> {
    await db.update(knowledgeCollections).set(data).where(eq(knowledgeCollections.id, id));
  }

  async deleteCollection(id: string): Promise<void> {
    await db.delete(knowledgeCollections).where(eq(knowledgeCollections.id, id));
  }
}
