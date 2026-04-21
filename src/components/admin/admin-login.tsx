import React from 'react';
import { Lock } from 'lucide-react';

interface AdminLoginProps {
  password: string;
  onPasswordChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({
  password, onPasswordChange, onSubmit
}) => {
  return (
    <div className="h-screen bg-[#f6f5f4] flex items-center justify-center p-4">
      <div className="max-w-[320px] w-full bg-white border border-black/[0.1] rounded-[8px] p-8 shadow-notion">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 bg-[#D32F2F] rounded-[8px] flex items-center justify-center text-white mb-4 shadow-sm">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-[20px] font-bold text-black/90">Bảng điều khiển</h1>
          <p className="text-[#615d59] text-[13px] text-center mt-1">Nhập mật khẩu quản trị để tiếp tục</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <input 
            type="password" placeholder="Mật khẩu" 
            value={password} onChange={(e) => onPasswordChange(e.target.value)} 
            className="w-full notion-input" autoFocus 
          />
          <button type="submit" className="w-full notion-btn-primary">Đăng nhập</button>
        </form>
      </div>
    </div>
  );
};
