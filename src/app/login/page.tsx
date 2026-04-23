import { LoginButton } from '@/components/auth/login-button';
import Image from 'next/image';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#f6f5f4] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-[400px] bg-white rounded-2xl shadow-notion p-10 flex flex-col items-center space-y-8">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 relative">
            <Image src="/apple-icon.svg" alt="VMG MATE" fill className="object-contain" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-black/90">Chào mừng tới MATE</h1>
            <p className="text-[#615d59] mt-1">Sử dụng tài khoản VMG để tiếp tục</p>
          </div>
        </div>

        <LoginButton />

        <div className="pt-4 border-t border-black/[0.06] w-full text-center">
          <p className="text-[12px] text-[#a39e98]">
            Hệ thống tri thức nội bộ VMG MATE
          </p>
        </div>
      </div>
    </div>
  );
}
