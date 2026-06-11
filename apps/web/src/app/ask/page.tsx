import { ChatPanel } from '@/components/chat-panel';

export const metadata = { title: 'Ask AI · Logistics Analytics' };

export default function AskPage() {
  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-6 px-6 py-8 lg:px-10">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Ask AI</h1>
        <p className="text-sm text-muted-foreground">
          Ask a question in plain language. The AI routes it to a computation tool — it never
          invents numbers. Every answer shows how it was computed.
        </p>
      </header>
      <ChatPanel />
    </div>
  );
}
