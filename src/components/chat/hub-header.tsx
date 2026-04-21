import React from 'react';
import Image from 'next/image';

export const HubHeader: React.FC = () => {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 flex items-center justify-center border border-black/[0.08] rounded-[8px] bg-white">
          <Image src="/apple-icon.svg" alt="VMG" width={24} height={24} />
        </div>
        <div>
          <h1 className="text-[20px] font-bold tracking-tight text-black/90 leading-none">Trung tâm tri thức</h1>
          <p className="text-[13px] text-[#615d59] mt-1.5 font-medium">Chọn một không gian dữ liệu để bắt đầu trò chuyện.</p>
        </div>
      </div>
    </div>
  );
};
