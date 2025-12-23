import { ChatInterface } from '@/components/chat/chat-interface';

export default function Home() {
  return (
    <main className="h-screen w-full bg-slate-100 md:bg-slate-200 md:flex md:items-center md:justify-center">
      <ChatInterface />
    </main>
  );
}