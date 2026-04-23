'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);

  const updateCoords = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.top - 10, // Position above the element
        left: rect.left + rect.width / 2,
      });
    }
  };

  useEffect(() => {
    if (isVisible) {
      updateCoords();
      // Use capture to catch scroll events in parents
      window.addEventListener('scroll', updateCoords, true);
      window.addEventListener('resize', updateCoords);
    }
    return () => {
      window.removeEventListener('scroll', updateCoords, true);
      window.removeEventListener('resize', updateCoords);
    };
  }, [isVisible]);

  return (
    <div 
      ref={triggerRef}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      className="inline-flex"
    >
      {children}
      {isVisible && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed z-[9999] px-2 py-1 text-[10px] font-bold text-white bg-black/80 rounded shadow-lg pointer-events-none whitespace-nowrap animate-in fade-in zoom-in-95 duration-100"
          style={{ 
            top: `${coords.top}px`, 
            left: `${coords.left}px`,
            transform: 'translate(-50%, -100%)'
          }}
        >
          {content}
        </div>,
        document.body
      )}
    </div>
  );
};
