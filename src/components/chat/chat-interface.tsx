'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { Message } from '@core/types/chat';
import { MessageList } from './message-list';
import { ChatInput } from './chat-input';
import Image from 'next/image';
import { v4 as uuidv4 } from 'uuid';
import { useViewportHeight } from '@/hooks/use-viewport-height';
import { Menu, Settings2, LayoutGrid } from 'lucide-react';
import { LocationData } from './location-modal';
import { type KnowledgeCollection } from '@core/services/supabase.service';
import { toast } from 'sonner';
import { supabase } from '@/core/lib/supabase';
import { useRouter, useParams } from 'next/navigation';

interface ChatInterfaceProps {
  onToggleSidebar?: () => void;
}

const ChatContent: React.FC<ChatInterfaceProps> = ({ onToggleSidebar }) => {
  useViewportHeight();
  const params = useParams();
  const router = useRouter();
  
  // Initialize sessionId from URL if available, otherwise generate new
  const [sessionId, setSessionId] = useState<string>(() => (params?.id as string) || uuidv4());
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState<string>('');
  const [agentReflections, setAgentReflections] = useState<string[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(() => !!params?.id);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [collections, setCollections] = useState<KnowledgeCollection[]>([]);
  const [isCollectionsLoading, setIsCollectionsLoading] = useState(true);
  const [selectedCollection, setSelectedCollection] = useState('auto');
  const [user, setUser] = useState<any>(null);
  const [chatTitle, setChatTitle] = useState<string | undefined>(undefined);
  
  const lastSavedCountRef = useRef<number>(0);
  const prevSessionIdRef = useRef<string | null>(null);
  const isNewSessionLocalRef = useRef<boolean>(false);
  const reflectionsRef = useRef<string[]>([]);
  const tokenUsageRef = useRef<{ prompt_tokens: number; completion_tokens: number; total_tokens: number } | null>(null);
  const [phaseDetail, setPhaseDetail] = useState<string>('');

  const sessionFromPath = params?.id as string | undefined;

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };
    fetchUser();
  }, []);

  useEffect(() => {
    // Only act if the session in the URL has actually changed from what we last handled
    const currentPrevSessionId = prevSessionIdRef.current;
    if (sessionFromPath !== (currentPrevSessionId || undefined)) {
      const isNavigatingFromRoot = currentPrevSessionId === null;
      prevSessionIdRef.current = sessionFromPath || null;

      if (sessionFromPath) {
        // Navigated to or Refreshed on a specific session
        // Note: we fetch even if sessionFromPath === sessionId (e.g. on mount/refresh)
        // unless it's a locally started session that hasn't reached DB yet
        if (isNewSessionLocalRef.current) {
          isNewSessionLocalRef.current = false;
          return;
        }

        setMessages([]); // Clear immediately
        setSessionId(sessionFromPath);
        setIsHistoryLoading(true);
        lastSavedCountRef.current = 0;
        setChatTitle(undefined);
        fetch(`/api/conversation/${sessionFromPath}`)
          .then(async (res) => {
            if (!res.ok) throw new Error(`Failed to load: ${res.status}`);
            return res.json();
          })
          .then(data => {
            if (data.messages) {
              setMessages(data.messages.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })));
              lastSavedCountRef.current = data.messages.length;
            }
          })
          .catch((err) => {
            toast.error('Lỗi khi tải cuộc hội thoại');
          })
          .finally(() => setIsHistoryLoading(false));
      } else {
        // Navigated to root (Trò chuyện mới) from an existing session
        if (!isNavigatingFromRoot) {
          setSessionId(uuidv4());
          setMessages([]);
          setChatTitle(undefined);
          lastSavedCountRef.current = 0;
          isNewSessionLocalRef.current = false;
        }
      }
    }
  }, [sessionFromPath, sessionId]);

  useEffect(() => {
    fetch('/api/admin/collections')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setCollections(data); })
      .catch(() => {})
      .finally(() => setIsCollectionsLoading(false));
  }, []);

  useEffect(() => {
    const cachedLocation = localStorage.getItem('vmg-mate-location');
    if (cachedLocation) {
      try {
        setLocation(JSON.parse(cachedLocation));
        return;
      } catch (e) {
        localStorage.removeItem('vmg-mate-location');
      }
    }

    fetch('https://ip-api.com/json/')
      .then(r => r.json())
      .then((data) => {
        if (data.status !== 'success') return;
        const loc = {
          latitude: data.lat, longitude: data.lon,
          accuracy: null, city: data.city ?? null,
          region: data.regionName ?? null, country: data.country ?? null,
        };
        setLocation(loc);
        localStorage.setItem('vmg-mate-location', JSON.stringify(loc));
      })
      .catch(() => {});
  }, []);

  const saveConversation = useCallback(async (msgs: Message[], customTitle?: string, shouldRefreshSidebar: boolean = false) => {
    if (!user) return;
    try {
      await fetch('/api/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: sessionId,
          userId: user.id,
          title: customTitle,
          messages: msgs.filter(m => !m.isToolCall).map(m => ({ 
            role: m.role, 
            content: m.content, 
            timestamp: m.timestamp,
            citations: m.citations,
            reasoningTrace: m.reasoningTrace
          })),
          location,
          tokenUsage: tokenUsageRef.current,
        }),
      });
      if (shouldRefreshSidebar) {
        window.dispatchEvent(new CustomEvent('refresh-chat-history'));
      }
    } catch (e) {}
  }, [sessionId, location, user]);

  const sendMessage = async (content: string) => {
    const userMessage: Message = { id: uuidv4(), role: 'user', content: content.trim(), timestamp: new Date() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);
    setLoadingPhase('decompose');
    setAgentReflections([]);
    reflectionsRef.current = [];

    // If first message at root, update URL to lock in session
    if (messages.length === 0 && !params?.id) {
      isNewSessionLocalRef.current = true;
      router.replace(`/chat/${sessionId}`, { scroll: false });
    }

    // Generate title if it's the first message
    if (messages.length === 0) {
      try {
        const titleRes = await fetch('/api/conversation/generate-title', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ firstMessage: content.trim() }),
        });
        const titleData = await titleRes.json();
        if (titleData.title) setChatTitle(titleData.title);
      } catch (e) {}
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })), 
          serviceMode: selectedCollection 
        }),
      });
      if (!response.ok) throw new Error('Chat failed');
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantId = '';
      let streamBuffer = ''; 
      let fullContent = '';

      while (true) {
        const { value, done } = await reader!.read();
        if (done) break;
        
        streamBuffer += decoder.decode(value, { stream: true });
        const lines = streamBuffer.split('\n');
        streamBuffer = lines.pop() || '';
        
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            if (data.type === 'phase') { 
              setLoadingPhase(data.value); 
              if (data.detail) setPhaseDetail(data.detail); 
              if (data.reflection) {
                const thought = data.reflection;
                // Update Ref for immediate consumption in content handler
                if (reflectionsRef.current[reflectionsRef.current.length - 1] !== thought) {
                   reflectionsRef.current = [...reflectionsRef.current, thought];
                }
                setAgentReflections(reflectionsRef.current);
                
                // Update active assistant message if it exists
                if (assistantId) {
                  setMessages((prev) => prev.map((msg) => {
                    if (msg.id === assistantId) {
                      return { ...msg, reasoningTrace: reflectionsRef.current };
                    }
                    return msg;
                  }));
                }
              }
            }
            else if (data.type === 'tokens') { tokenUsageRef.current = data.value; }
            else if (data.type === 'citations') {
              setMessages((prev) => prev.map((msg) => msg.id === assistantId ? { ...msg, citations: data.value } : msg));
            }
            else if (data.type === 'memory_update') {
              setMessages((prev) => prev.map((msg) => msg.id === assistantId ? { ...msg, memoryUpdated: true } : msg));
            }
            else if (data.type === 'content') {
              const text = data.value;
              fullContent += text;
              if (!assistantId) {
                setLoadingPhase('generate');
                assistantId = uuidv4();
                setMessages((prev) => [...prev, { 
                  id: assistantId, 
                  role: 'assistant', 
                  content: text, 
                  timestamp: new Date(),
                  reasoningTrace: reflectionsRef.current
                }]);
              } else {
                setMessages((prev) => prev.map((msg) => msg.id === assistantId ? { ...msg, content: msg.content + text } : msg));
              }
            }
          } catch (e) {}
        }
      }
    } catch (error) {
      toast.error('Lỗi kết nối với máy chủ trợ lý.');
    } finally {
      setIsLoading(false);
      setLoadingPhase('');
    }
  };

  useEffect(() => {
    if (!isLoading && messages.length > lastSavedCountRef.current && messages.some(m => m.role === 'assistant')) {
       // Always signal refresh on save to re-order history (push to top)
       saveConversation(messages, chatTitle, true);
       lastSavedCountRef.current = messages.length;
    }
  }, [isLoading, messages, saveConversation, chatTitle]);

  return (
    <div className="flex-1 flex flex-col relative transition-all duration-300 min-h-0">
      {/* ZaUI Native Header (44px + Safe Area) */}
      <header 
        className="bg-white shrink-0 z-30 border-b border-black/[0.06] px-4"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="h-[44px] flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <button onClick={onToggleSidebar} className="p-1 -ml-1 text-black/40 md:hidden hover:bg-black/5 rounded">
              <Menu className="w-5 h-5" strokeWidth={1.5} />
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button className="h-8 px-3 text-[13px] font-medium text-black/50 hover:bg-black/5 rounded transition-all flex items-center gap-1.5">
              <LayoutGrid className="w-4 h-4" strokeWidth={1.5} /> Không gian
            </button>
            <div className="w-px h-4 bg-black/[0.08] mx-1"></div>
            <button className="p-2 text-black/40 hover:bg-black/5 rounded transition-colors"><Settings2 className="w-5 h-5" strokeWidth={1.5} /></button>
          </div>
        </div>
      </header>

      {/* Dynamic App Content */}
      <div className="flex-1 overflow-hidden relative flex flex-col bg-[#f6f5f4]">
        <MessageList 
          messages={messages} 
          isLoading={isLoading}
          isHistoryLoading={isHistoryLoading}
          loadingPhase={loadingPhase}
          phaseDetail={phaseDetail}
          agentReflections={agentReflections}
          currentMode={selectedCollection}
          sessionId={sessionId}
          collections={collections}
          onCollectionSelect={setSelectedCollection}
          onSuggestionClick={(t) => sendMessage(t)} 
        />
      </div>

      {/* Focused Input Bar (Tightened & Floating) */}
      <div className="shrink-0 bg-transparent px-4 md:px-16 lg:px-32 pt-px pb-4" style={{ paddingBottom: 'calc(max(env(safe-area-inset-bottom), 0px) + 8px)' }}>
        <div className="max-w-4xl mx-auto">
          <ChatInput
            input={input}
            handleInputChange={(e) => setInput(e.target.value)}
            handleSubmit={(e) => { e.preventDefault(); if(input.trim()) sendMessage(input); }}
            isLoading={isLoading}
          />
          <div className="mt-2 flex justify-center px-4">
            <p className="text-[11px] text-[#a39e98] text-center leading-none">
              VMG MATE là Trợ lý AI. Vui lòng kiểm tra lại thông tin. <a href="mailto:support@vmg.edu.vn" className="underline hover:text-[#D32F2F]">Góp ý lỗi</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ChatInterface: React.FC<ChatInterfaceProps> = (props) => (
  <Suspense fallback={<div>Loading...</div>}>
    <ChatContent {...props} />
  </Suspense>
);
