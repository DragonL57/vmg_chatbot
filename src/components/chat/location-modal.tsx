'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, Loader2 } from 'lucide-react';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number | null;
}

interface LocationModalProps {
  onAccept: (location: LocationData) => void;
}

export const LocationModal: React.FC<LocationModalProps> = ({ onAccept }) => {
  const [state, setState] = useState<'idle' | 'loading' | 'denied'>('idle');

  // If user already granted permission previously, grab it silently
  useEffect(() => {
    if (!navigator.permissions) return;
    navigator.permissions.query({ name: 'geolocation' }).then((result) => {
      if (result.state === 'granted') {
        requestLocation();
      }
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requestLocation = () => {
    if (!navigator.geolocation) return;
    setState('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onAccept({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy ?? null,
        });
      },
      () => {
        setState('denied');
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl shadow-2xl animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300">
        {/* Handle bar mobile */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>

        <div className="px-6 pt-5 pb-7">
          <div className="flex flex-col items-center text-center mb-5">
            <div className="bg-red-50 p-4 rounded-2xl mb-4">
              <MapPin className="w-7 h-7 text-red-500" />
            </div>
            <p className="text-base font-bold text-slate-800 mb-1">Cho phép truy cập vị trí</p>
            <p className="text-xs text-slate-500 leading-relaxed">
              Ứng dụng cần vị trí của bạn để xác định trung tâm VMG phụ trách và cải thiện chất lượng hỗ trợ. Vui lòng nhấn <strong>Cho phép</strong> khi trình duyệt hỏi.
            </p>
          </div>

          {state === 'denied' && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 text-xs text-amber-700 text-center leading-relaxed">
              Bạn đã từ chối quyền vị trí. Vui lòng vào <strong>Cài đặt trình duyệt</strong> → cho phép vị trí cho trang này, sau đó nhấn thử lại.
            </div>
          )}

          <button
            onClick={requestLocation}
            disabled={state === 'loading'}
            className="w-full py-3 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-60 disabled:cursor-wait rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {state === 'loading' ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Đang lấy vị trí...</>
            ) : state === 'denied' ? (
              <><MapPin className="w-4 h-4" /> Thử lại</>
            ) : (
              <><MapPin className="w-4 h-4" /> Cho phép truy cập vị trí</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
