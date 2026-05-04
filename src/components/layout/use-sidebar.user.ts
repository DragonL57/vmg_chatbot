'use client';

import { useAuthUser } from '@/hooks/use-auth-user';
import {
  getUserInitial,
  getUserName,
  getUserAvatar,
} from './sidebar-utils';

export const useSidebarUser = () => {
  const user = useAuthUser();

  const userInitial = getUserInitial(user);
  const userAvatar = getUserAvatar(user);
  const userName = getUserName(user);

  return { userInitial, userAvatar, userName };
};
