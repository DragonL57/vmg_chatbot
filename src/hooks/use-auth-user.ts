'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/core/lib/supabase';
import type { User } from '@supabase/supabase-js';

/**
 * Hook that retrieves the currently authenticated Supabase user.
 * Isolates the direct supabase infrastructure import to this single file.
 */
export const useAuthUser = (): User | null => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  return user;
};
