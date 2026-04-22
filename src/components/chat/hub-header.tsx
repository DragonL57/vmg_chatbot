import React from 'react';
import Image from 'next/image';

export const HubHeader: React.FC = () => {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-[20px] font-bold tracking-tight text-black/90 leading-none">Trung tâm tri thức</h1>
        <p className="text-[13px] text-[#615d59] mt-1.5 font-medium">Chọn một không gian dữ liệu để bắt đầu trò chuyện.</p>
      </div>
    </div>
  );
};
