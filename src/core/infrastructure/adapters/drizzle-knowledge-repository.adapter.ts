import { IKnowledgeRepositoryPort, KnowledgeFile, KnowledgeCollection } from "../../application/ports/knowledge-repository.port";
import { db } from "../../db";
import { knowledgeFiles, knowledgeCollections } from "../../db/schema";
import { eq, desc, asc } from "drizzle-orm";

export class DrizzleKnowledgeRepositoryAdapter implements IKnowledgeRepositoryPort {
  public async listFiles(): Promise<KnowledgeFile[]> {
    const results = await db.select().from(knowledgeFiles).orderBy(desc(knowledgeFiles.createdAt));
    return results.map(r => ({
      id: r.id,
      filename: r.filename,
      mode: r.mode,
      folder: r.folder || undefined,
      status: r.status as 'pending' | 'indexing' | 'completed' | 'failed',
      progress: r.progress || 0,
      summary: r.summary || undefined,
      logs: (r.logs as string[]) || [],
      metadata: (r.metadata as Record<string, unknown>) || undefined
    }));
  }

  public async getFileByFilename(filename: string): Promise<KnowledgeFile | null> {
    const [result] = await db.select().from(knowledgeFiles).where(eq(knowledgeFiles.filename, filename));
    if (!result) return null;
    return {
      id: result.id,
      filename: result.filename,
      mode: result.mode,
      folder: result.folder || undefined,
      status: result.status as 'pending' | 'indexing' | 'completed' | 'failed',
      progress: result.progress || 0,
      summary: result.summary || undefined,
      logs: (result.logs as string[]) || [],
      metadata: (result.metadata as Record<string, unknown>) || undefined
    };
  }

  public async upsertFile(file: Partial<KnowledgeFile> & { id: string }): Promise<void> {
    const updateData: Partial<typeof knowledgeFiles.$inferInsert> = {
      updatedAt: new Date(),
    };
    
    if (file.status !== undefined) updateData.status = file.status;
    if (file.progress !== undefined) updateData.progress = file.progress;
    if (file.summary !== undefined) updateData.summary = file.summary;
    if (file.logs !== undefined) updateData.logs = file.logs;
    if (file.filename !== undefined) updateData.filename = file.filename;
    if (file.mode !== undefined) updateData.mode = file.mode;
    if (file.folder !== undefined) updateData.folder = file.folder;
    if (file.metadata !== undefined) updateData.metadata = file.metadata;

    if (file.filename && file.mode) {
      await this.insertOrUpdate(file, updateData);
    } else {
      await db.update(knowledgeFiles).set(updateData).where(eq(knowledgeFiles.id, file.id));
    }
  }

  private async insertOrUpdate(file: Partial<KnowledgeFile> & { id: string }, updateData: Partial<typeof knowledgeFiles.$inferInsert>): Promise<void> {
    await db.insert(knowledgeFiles).values({
      id: file.id,
      filename: file.filename!,
      mode: file.mode!,
      folder: file.folder ?? 'root',
      status: file.status ?? 'pending',
      progress: file.progress ?? 0,
      summary: file.summary,
      logs: file.logs ?? [],
      metadata: file.metadata ?? {},
      updatedAt: new Date(),
    }).onConflictDoUpdate({ target: knowledgeFiles.filename, set: updateData });
  }

  public async deleteFile(id: string): Promise<void> {
    await db.delete(knowledgeFiles).where(eq(knowledgeFiles.id, id));
  }

  public async listCollections(): Promise<KnowledgeCollection[]> {
    const results = await db.select().from(knowledgeCollections).orderBy(asc(knowledgeCollections.createdAt));
    return results.map(r => ({
      id: r.id,
      name: r.name,
      qdrantName: r.qdrantName,
      description: r.description || undefined
    }));
  }

  public async createCollection(data: Omit<KnowledgeCollection, 'id'>): Promise<KnowledgeCollection> {
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

  public async updateCollection(id: string, data: Partial<KnowledgeCollection>): Promise<void> {
    await db.update(knowledgeCollections).set(data).where(eq(knowledgeCollections.id, id));
  }

  public async deleteCollection(id: string): Promise<void> {
    await db.delete(knowledgeCollections).where(eq(knowledgeCollections.id, id));
  }
}
