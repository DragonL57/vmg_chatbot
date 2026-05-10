'use client';

import React from 'react';
import Image from 'next/image';
import { Calendar, Mail, Shield, UserCircle } from 'lucide-react';
import type { User } from '@supabase/supabase-js';

type LoadingViewProps = { label?: string };

export const LoadingView = ({ label = 'Đang tải...' }: LoadingViewProps) => (
  <div className="flex-1 flex items-center justify-center bg-[#f6f5f4]">
    <div className="animate-pulse flex flex-col items-center gap-4">
      <div className="w-20 h-20 bg-black/5 rounded-full" />
      <div className="h-4 bg-black/5 rounded w-32" />
      <span className="text-[12px] text-black/40">{label}</span>
    </div>
  </div>
);

type ProfileHeaderProps = { user: User | null };

export const ProfileHeader = ({ user }: ProfileHeaderProps) => (
  <div className="bg-white rounded-[16px] border border-black/[0.06] p-8 shadow-zalo-l1 flex flex-col md:flex-row items-center gap-8">
    <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-md">
      {user?.user_metadata?.avatar_url ? (
        <Image src={user.user_metadata.avatar_url} alt="Avatar" fill sizes="96px" className="object-cover" />
      ) : (
        <div className="w-full h-full bg-black/5 flex items-center justify-center">
          <UserCircle className="w-12 h-12 text-black/10" />
        </div>
      )}
    </div>
    <div className="flex-1 text-center md:text-left space-y-2">
      <h1 className="text-[24px] font-bold text-black/90">
        {user?.user_metadata?.full_name || 'Người dùng VMG'}
      </h1>
      <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
        <div className="flex items-center gap-1.5 text-[13px] text-black/40 font-medium">
          <Mail className="w-3.5 h-3.5" />
          {user?.email}
        </div>
        <div className="flex items-center gap-1.5 text-[13px] text-black/40 font-medium">
          <Shield className="w-3.5 h-3.5" />
          Thành viên
        </div>
        <div className="flex items-center gap-1.5 text-[13px] text-black/40 font-medium">
          <Calendar className="w-3.5 h-3.5" />
          Tham gia {user?.created_at ? new Date(user.created_at).toLocaleDateString('vi-VN') : '---'}
        </div>
      </div>
    </div>
  </div>
);
