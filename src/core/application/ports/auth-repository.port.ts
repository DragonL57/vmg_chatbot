export interface AuthUser {
  id: string;
  supabaseId: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
  role: 'admin' | 'staff' | 'user';
}

export interface IAuthRepository {
  getInternalId(supabaseId: string): Promise<string | null>;
  getUser(id: string): Promise<AuthUser | null>;
  getOrCreateUser(data: { supabaseId: string; email: string; fullName?: string; avatarUrl?: string }): Promise<AuthUser>;
  isAdmin(id: string): Promise<boolean>;
}
