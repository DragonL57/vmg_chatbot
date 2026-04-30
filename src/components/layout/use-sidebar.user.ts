'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/core/lib/supabase';
import type { User } from '@supabase/supabase-js';
import {
  getUserInitial,
  getUserName,
  getUserAvatar,
} from './sidebar-utils';

export const useSidebarUser = () => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };

    queueMicrotask(fetchUser);
  }, []);

  const userInitial = getUserInitial(user);
  const userAvatar = getUserAvatar(user);
  const userName = getUserName(user);

  return { userInitial, userAvatar, userName };
};
