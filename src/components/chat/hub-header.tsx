import React from 'react';

export const HubHeader: React.FC = () => {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-[13px] text-[#615d59] font-medium uppercase tracking-wider">Hệ thống tri thức</p>
        <p className="text-[15px] text-[#a39e98] mt-1 font-medium">Chọn một không gian để bắt đầu trò chuyện.</p>
      </div>
    </div>
  );
};
