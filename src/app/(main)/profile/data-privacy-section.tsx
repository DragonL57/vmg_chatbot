'use client';

import React, { useState } from 'react';
import { Shield } from 'lucide-react';
import { toast } from 'sonner';

async function downloadUserData() {
  const res = await fetch('/api/user/data');
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Xuất dữ liệu thất bại');
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mate-data-export-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

const btn = 'px-4 py-1.5 text-[13px] font-medium rounded-[4px] transition-all border-none';

export const DataPrivacySection = () => {
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try { await downloadUserData(); toast.success('Dữ liệu đã được tải xuống'); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Xuất dữ liệu thất bại'); }
    finally { setExporting(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch('/api/user/data', { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) { toast.success(data.message || 'Dữ liệu đã được ẩn danh hóa'); setConfirmDelete(false); }
      else { toast.error(data.error || 'Xóa dữ liệu thất bại'); }
    } catch { toast.error('Xóa dữ liệu thất bại'); }
    finally { setDeleting(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-2">
        <Shield className="w-4 h-4 text-black/40" />
        <h2 className="text-[17px] font-bold text-black/80">Quyền riêng tư dữ liệu</h2>
      </div>
      <div className="bg-white rounded-[12px] border border-black/[0.08] overflow-hidden shadow-sm divide-y divide-black/[0.04]">
        <div className="p-4 flex items-center justify-between">
          <div>
            <p className="text-[14px] font-medium text-black/80">Xuất dữ liệu của tôi</p>
            <p className="text-[12px] text-black/40">Tải xuống tất cả dữ liệu cá nhân (JSON)</p>
          </div>
          <button onClick={handleExport} disabled={exporting}
            className={`${btn} bg-black/[0.04] hover:bg-black/[0.08] disabled:opacity-40`}>
            {exporting ? 'Đang xuất...' : 'Xuất'}
          </button>
        </div>
        <div className="p-4 flex items-center justify-between">
          <div>
            <p className="text-[14px] font-medium text-black/80">Xóa dữ liệu của tôi</p>
            <p className="text-[12px] text-black/40">Ẩn danh hóa dữ liệu cá nhân (không thể hoàn tác)</p>
          </div>
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <button onClick={handleDelete} disabled={deleting}
                className={`${btn} bg-red-600 text-white hover:bg-red-700 disabled:opacity-40`}>
                {deleting ? 'Đang xóa...' : 'Xác nhận'}
              </button>
              <button onClick={() => setConfirmDelete(false)}
                className={`${btn} bg-black/[0.04] hover:bg-black/[0.08]`}>Hủy</button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)}
              className={`${btn} text-red-600 hover:bg-red-50`}>Xóa</button>
          )}
        </div>
      </div>
      <p className="px-2 text-[11px] text-black/30 leading-relaxed italic">
        * Dữ liệu của bạn được xử lý theo Luật Bảo vệ dữ liệu cá nhân (91/2025/QH15).{' '}
        Bạn có quyền truy cập, chỉnh sửa và xóa dữ liệu của mình bất kỳ lúc nào.
      </p>
    </div>
  );
};
