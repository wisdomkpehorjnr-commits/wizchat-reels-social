import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Bell, Send, Plus, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface WizAiChatProps {
  onClose: () => void;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wizai-chat`;

async function streamChat({
  messages,
  onDelta,
  onDone,
  onError,
}: {
  messages: { role: string; content: string }[];
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
}) {
  const resp = await fetch(CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages }),
  });

  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    onError(data.error || 'Something went wrong. Please try again.');
    return;
  }

  if (!resp.body) {
    onError('No response from AI');
    return;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let textBuffer = '';
  let streamDone = false;

  while (!streamDone) {
    const { done, value } = await reader.read();
    if (done) break;
    textBuffer += decoder.decode(value, { stream: true });

    let newlineIndex: number;
    while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
      let line = textBuffer.slice(0, newlineIndex);
      textBuffer = textBuffer.slice(newlineIndex + 1);

      if (line.endsWith('\r')) line = line.slice(0, -1);
      if (line.startsWith(':') || line.trim() === '') continue;
      if (!line.startsWith('data: ')) continue;

      const jsonStr = line.slice(6).trim();
      if (jsonStr === '[DONE]') {
        streamDone = true;
        break;
      }

      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
      } catch {
        textBuffer = line + '\n' + textBuffer;
        break;
      }
    }
  }

  // Final flush
  if (textBuffer.trim()) {
    for (let raw of textBuffer.split('\n')) {
      if (!raw) continue;
      if (raw.endsWith('\r')) raw = raw.slice(0, -1);
      if (raw.startsWith(':') || raw.trim() === '') continue;
      if (!raw.startsWith('data: ')) continue;
      const jsonStr = raw.slice(6).trim();
      if (jsonStr === '[DONE]') continue;
      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
      } catch { /* ignore */ }
    }
  }

  onDone();
}

const WizAiChat = ({ onClose }: WizAiChatProps) => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isThinking) return;

    if (showWelcome) setShowWelcome(false);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsThinking(true);

    // Build conversation history for context
    const conversationHistory = [...messages, userMessage].map(m => ({
      role: m.role,
      content: m.content,
    }));

    let assistantSoFar = '';

    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      const currentContent = assistantSoFar;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant') {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: currentContent } : m
          );
        }
        return [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant' as const,
          content: currentContent,
          timestamp: new Date(),
        }];
      });
    };

    try {
      await streamChat({
        messages: conversationHistory,
        onDelta: (chunk) => upsertAssistant(chunk),
        onDone: () => setIsThinking(false),
        onError: (error) => {
          setMessages(prev => [...prev, {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: error,
            timestamp: new Date(),
          }]);
          setIsThinking(false);
        },
      });
    } catch (e) {
      console.error('WizAi stream error:', e);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Hmm, I'm having trouble connecting. Please try again! 🔄",
        timestamp: new Date(),
      }]);
      setIsThinking(false);
    }
  };

  const handleImageUpload = () => {
    toast({
      title: "Premium Feature",
      description: "Upgrade to Pro to upload images!",
      variant: "destructive",
    });
  };

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card px-4 py-3 flex items-center justify-between">
        <button onClick={onClose} className="p-2 -ml-2">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center overflow-hidden">
            <svg width="32" height="32" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="200" rx="100" fill="white"/><ellipse cx="100" cy="85" rx="55" ry="45" fill="black"/><ellipse cx="82" cy="80" rx="6" ry="6" fill="white"/><ellipse cx="118" cy="80" rx="6" ry="6" fill="white"/><rect x="70" y="124" width="60" height="19" rx="9.5" fill="black" stroke="white" strokeWidth="4"/></svg>
          </div>
          <span className="font-bold text-primary">WizAi</span>
        </div>
        <button className="p-2 -mr-2">
          <Bell className="w-5 h-5 text-foreground" />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 relative">
        {showWelcome && (
          <div className="absolute inset-x-0 top-[20%] text-center px-4 animate-fade-in">
            <p className="text-primary text-lg font-medium italic">
              I'm WizAi — how may I assist you? 🤖
            </p>
          </div>
        )}

        <div className="space-y-4 max-w-2xl mx-auto">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.role === 'assistant'
                    ? 'bg-primary/10 text-foreground'
                    : 'bg-background border-2 border-primary text-foreground'
                }`}
              >
                {message.role === 'assistant' ? (
                  <div className="text-sm prose prose-sm dark:prose-invert max-w-none [&>p]:my-1 [&>ul]:my-1 [&>ol]:my-1">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm">{message.content}</p>
                )}
              </div>
            </div>
          ))}

          {isThinking && messages[messages.length - 1]?.role !== 'assistant' && (
            <div className="flex justify-start">
              <div className="bg-primary/10 rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
                  <span className="w-2 h-2 bg-primary rounded-full animate-pulse delay-75"></span>
                  <span className="w-2 h-2 bg-primary rounded-full animate-pulse delay-150"></span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Thinking...</p>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-border bg-card px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-2">
          <button
            onClick={handleImageUpload}
            className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0"
          >
            <Plus className="w-5 h-5 text-primary" />
          </button>
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask me anything..."
            className="flex-1 border-2 border-primary"
            disabled={isThinking}
          />
          <Button
            onClick={handleSend}
            disabled={!inputValue.trim() || isThinking}
            className="font-bold px-6"
          >
            Ask
          </Button>
        </div>
      </div>
    </div>
  );
};

export default WizAiChat;
