export type MemoryCategory = 'persona' | 'preference' | 'entity' | 'episodic' | 'general';

export interface UserMemory {
  readonly id: string;
  readonly userId: string;
  readonly fact: string;
  readonly category: MemoryCategory;
  readonly metadata?: Record<string, unknown>;
  readonly createdAt: Date;
}

export type MemoryActionOp = 'ADD' | 'UPDATE' | 'DELETE';

export interface MemoryAction {
  readonly op: MemoryActionOp;
  readonly fact?: string;
  readonly category?: MemoryCategory;
  readonly id?: string;
}

export interface MemoryExtraction {
  readonly actions: ReadonlyArray<MemoryAction>;
}
