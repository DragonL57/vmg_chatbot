import React, { useEffect, useRef } from 'react';
import { Message, ServiceMode } from '@/types/chat';
import Image from 'next/image';
import { MessageItem } from './message-item';

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  currentMode: ServiceMode;
  onSuggestionClick?: (text: string) => void;
}

const TypingIndicator = () => (
  <div className="flex justify-start mb-4 animate-in fade-in slide-in-from-left-2 duration-300">
    <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm shadow-slate-200/50">
      <div className="flex items-center gap-2">
        <div className="relative overflow-hidden group">
          <p className="text-xs font-medium text-slate-400 italic">
            (Mình đang soạn, bạn chờ một tí nhé)
          </p>
          <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/60 to-transparent -translate-x-full animate-[shimmer_2s_infinite] skew-x-[-20deg]"></div>
        </div>
      </div>
    </div>
  </div>
);

export const MessageList: React.FC<MessageListProps> = ({ messages, isLoading, currentMode, onSuggestionClick }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const showTyping = isLoading && (messages.length === 0 || messages[messages.length - 1].role === 'user');

  const eslSuggestions = [
    "Tìm lớp cho bé (4-11 tuổi)",
    "Luyện thi IELTS cam kết",
    "Tiếng Anh giao tiếp đi làm"
  ];

  const abroadSuggestions = [
    "Tư vấn du học Anh/Mỹ/Úc",
    "Học bổng du học 2026",
    "Du học hè trải nghiệm"
  ];

  const suggestions = currentMode === 'esl' ? eslSuggestions : abroadSuggestions;

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto px-4 py-6 space-y-4 bg-slate-50/50 scroll-smooth"
    >
      {messages.length === 0 && !isLoading ? (
        <div className="flex flex-col items-center justify-center h-full text-center px-8 space-y-6 animate-in fade-in zoom-in-95 duration-700">
          <div className="bg-white p-6 rounded-3xl shadow-xl shadow-slate-200/50 relative">
            <div className="absolute -top-3 -right-3 bg-white p-1 rounded-xl shadow-lg border border-slate-100 h-10 w-10 flex items-center justify-center overflow-hidden">
               <Image src="/apple-icon.svg" alt="VMG Logo" width={32} height={32} className="object-contain" />
            </div>
            <div className="text-4xl mb-4">👋</div>
            <h2 className="text-lg font-bold text-slate-800 mb-2">Chào mừng bạn đến với VMG!</h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              {currentMode === 'esl' 
                ? 'Em là chuyên viên tư vấn từ VMG English, sẵn sàng giải đáp mọi thắc mắc về khóa học và lộ trình tại trung tâm 😊'
                : 'Em là chuyên viên tư vấn từ VMG Global Pathway, sẵn sàng hỗ trợ anh/chị tìm kiếm lộ trình du học tối ưu nhất 😊'}
            </p>
          </div>
          
          <div className="grid grid-cols-1 gap-2 w-full max-w-xs">
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Bạn đang quan tâm...</p>
             {suggestions.map((text) => (
               <button 
                 key={text} 
                 onClick={() => onSuggestionClick?.(text)}
                 className="bg-white/80 backdrop-blur-sm border border-slate-200 py-2.5 px-4 rounded-xl text-xs text-slate-600 font-medium hover:border-[#D32F2F] hover:text-[#D32F2F] transition-all active:scale-95 text-left"
               >
                 {text}
               </button>
             ))}
          </div>
        </div>
      ) : (
        <>
          {messages.map((msg) => (
            msg.content ? <MessageItem key={msg.id} message={msg} /> : null
          ))}
          {showTyping && <TypingIndicator />}
        </>
      )}
    </div>
  );
};
