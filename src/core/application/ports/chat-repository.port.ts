export interface Conversation {
  id: string;
  title: string;
  isStarred: boolean;
  updatedAt: Date;
}

export interface IChatRepository {
  listByUser(userId: string): Promise<Conversation[]>;
  getById(id: string, userId: string): Promise<any>;
  upsert(conversation: any): Promise<void>;
  delete(id: string, userId: string): Promise<void>;
  star(id: string, userId: string, isStarred: boolean): Promise<void>;
  rename(id: string, userId: string, title: string): Promise<void>;
}
