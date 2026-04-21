import React from 'react';
import { Menu, RefreshCw } from 'lucide-react';

interface AdminHeaderProps {
  view: 'silos' | 'files';
  activeSiloName?: string;
  onViewChange: (view: 'silos' | 'files') => void;
  onSidebarOpen: () => void;
  onSync: () => void;
  onLogout: () => void;
  loading: boolean;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  view,
  activeSiloName,
  onViewChange,
  onSidebarOpen,
  onSync,
  onLogout,
  loading
}) => {
  return (
    <header className="h-14 flex items-center justify-between px-6 border-b border-black/[0.06] shrink-0 bg-white/80 backdrop-blur-sm z-10">
      <div className="flex items-center gap-4 overflow-hidden">
        <button 
          onClick={onSidebarOpen} 
          className="p-1 md:hidden hover:bg-black/5 rounded transition-colors"
        >
          <Menu className="w-4 h-4 text-black/60" />
        </button>
        <div className="flex items-center gap-1.5 text-[14px] font-medium text-black/40 whitespace-nowrap overflow-hidden">
          <button 
            onClick={() => onViewChange('silos')} 
            className="hover:text-black/80 transition-colors"
          >
            Kho tri thức
          </button>
          {view === 'files' && (
            <>
              <span className="text-black/20">/</span>
              <span className="text-black/80 truncate font-semibold">{activeSiloName}</span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button 
          onClick={onSync} 
          className="h-8 px-3 text-[13px] font-medium text-black/60 hover:bg-black/5 rounded flex items-center gap-2 transition-all active:scale-95"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> 
          Làm mới
        </button>
        <div className="w-px h-3.5 bg-black/[0.08] mx-1"></div>
        <button 
          onClick={onLogout} 
          className="h-8 px-3 text-[13px] font-medium text-red-600 hover:bg-red-50 rounded transition-colors"
        >
          Đăng xuất
        </button>
      </div>
    </header>
  );
};
