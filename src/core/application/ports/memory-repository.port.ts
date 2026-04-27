import { UserMemory, MemoryCategory } from "../../domain/entities/memory";

export interface IMemoryRepository {
  getByUserId(userId: string, limit?: number): Promise<UserMemory[]>;
  add(userId: string, fact: string, category: MemoryCategory): Promise<void>;
  update(id: string, userId: string, fact: string): Promise<void>;
  delete(id: string, userId: string): Promise<void>;
}
