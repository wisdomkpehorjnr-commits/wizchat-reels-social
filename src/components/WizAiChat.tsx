import { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowLeft, Bell, Send, Plus, Menu, ImagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import ReactMarkdown from 'react-markdown';
import WizAiNotificationsPanel from './wizai/WizAiNotificationsPanel';
import WizAiChatSidebar from './wizai/WizAiChatSidebar';
import {
  isPremiumUnlocked,
  getNotifications,
  markAllNotificationsRead,
  getChatSessions,
  saveChatSessions,
  getActiveChatId,
  setActiveChatId,
  createNewSession,
  WizAiMessage,
  WizAiChatSession,
  WizAiNotification,
} from './wizai/WizAiPremiumUtils';

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
      if (jsonStr === '[DONE]') { streamDone = true; break; }

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
  const { user } = useAuth();
  const userId = user?.id || 'anonymous';

  // Premium
  const hasPremium = isPremiumUnlocked(userId);

  // Notifications
  const [notifications, setNotifications] = useState<WizAiNotification[]>(() => getNotifications(userId));
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  // Chat sessions
  const [sessions, setSessions] = useState<WizAiChatSession[]>(() => {
    const existing = getChatSessions(userId);
    if (existing.length === 0) {
      const first = createNewSession();
      saveChatSessions(userId, [first]);
      setActiveChatId(userId, first.id);
      return [first];
    }
    return existing;
  });
  const [activeChatId, setActiveChat] = useState<string>(() => {
    const stored = getActiveChatId(userId);
    if (stored && sessions.find(s => s.id === stored)) return stored;
    return sessions[0]?.id || '';
  });
  const [showSidebar, setShowSidebar] = useState(false);

  const activeSession = sessions.find(s => s.id === activeChatId);
  const messages = activeSession?.messages || [];

  const [inputValue, setInputValue] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Persist sessions on change
  const updateSessions = useCallback((newSessions: WizAiChatSession[]) => {
    setSessions(newSessions);
    saveChatSessions(userId, newSessions);
  }, [userId]);

  const updateActiveMessages = useCallback((updater: (msgs: WizAiMessage[]) => WizAiMessage[]) => {
    setSessions(prev => {
      const next = prev.map(s =>
        s.id === activeChatId
          ? { ...s, messages: updater(s.messages), updatedAt: Date.now(), title: s.messages.length === 0 ? s.title : s.title }
          : s
      );
      saveChatSessions(userId, next);
      return next;
    });
  }, [activeChatId, userId]);

  const handleNewChat = () => {
    const session = createNewSession();
    const newSessions = [session, ...sessions];
    updateSessions(newSessions);
    setActiveChat(session.id);
    setActiveChatId(userId, session.id);
    setShowSidebar(false);
  };

  const handleSelectChat = (id: string) => {
    setActiveChat(id);
    setActiveChatId(userId, id);
    setShowSidebar(false);
  };

  const handleDeleteChat = (id: string) => {
    const filtered = sessions.filter(s => s.id !== id);
    if (filtered.length === 0) {
      const fresh = createNewSession();
      updateSessions([fresh]);
      setActiveChat(fresh.id);
      setActiveChatId(userId, fresh.id);
    } else {
      updateSessions(filtered);
      if (activeChatId === id) {
        setActiveChat(filtered[0].id);
        setActiveChatId(userId, filtered[0].id);
      }
    }
    toast({ title: 'Chat deleted' });
  };

  const handleImageUpload = () => {
    if (!hasPremium) {
      toast({
        title: "Premium Feature",
        description: "Upgrade to WizAi Pro to upload images! Go to Premium → Unlimited WizAi.",
        variant: "destructive",
      });
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Only images are supported', variant: 'destructive' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Image must be under 5MB', variant: 'destructive' });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      const userMsg: WizAiMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: '📷 [Image uploaded]',
        imageUrl: base64,
        timestamp: Date.now(),
      };

      updateActiveMessages(prev => [...prev, userMsg]);

      // Auto-title
      if (activeSession && activeSession.messages.length === 0) {
        setSessions(prev => {
          const next = prev.map(s => s.id === activeChatId ? { ...s, title: 'Image Chat' } : s);
          saveChatSessions(userId, next);
          return next;
        });
      }

      setIsThinking(true);
      sendToAI([...messages, userMsg]);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const sendToAI = async (allMessages: WizAiMessage[]) => {
    const conversationHistory = allMessages.map(m => ({
      role: m.role,
      content: m.imageUrl
        ? `[User uploaded an image] ${m.content}`
        : m.content,
    }));

    let assistantSoFar = '';

    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      const currentContent = assistantSoFar;
      updateActiveMessages(prev => {
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
          timestamp: Date.now(),
        }];
      });
    };

    try {
      await streamChat({
        messages: conversationHistory,
        onDelta: (chunk) => upsertAssistant(chunk),
        onDone: () => setIsThinking(false),
        onError: (error) => {
          updateActiveMessages(prev => [...prev, {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: error,
            timestamp: Date.now(),
          }]);
          setIsThinking(false);
        },
      });
    } catch (e) {
      console.error('WizAi stream error:', e);
      updateActiveMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Hmm, I'm having trouble connecting. Please try again! 🔄",
        timestamp: Date.now(),
      }]);
      setIsThinking(false);
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isThinking) return;

    const userMessage: WizAiMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: Date.now(),
    };

    // Auto-title from first message
    if (activeSession && activeSession.messages.length === 0) {
      const title = inputValue.slice(0, 30) + (inputValue.length > 30 ? '...' : '');
      setSessions(prev => {
        const next = prev.map(s => s.id === activeChatId ? { ...s, title } : s);
        saveChatSessions(userId, next);
        return next;
      });
    }

    updateActiveMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsThinking(true);

    await sendToAI([...messages, userMessage]);
  };

  const handleMarkAllRead = () => {
    markAllNotificationsRead(userId);
    setNotifications(getNotifications(userId));
  };

  const showWelcome = messages.length === 0;

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelected}
      />

      {/* Header */}
      <div className="border-b border-border bg-card px-4 py-3 flex items-center justify-between relative">
        <div className="flex items-center gap-1">
          <button onClick={onClose} className="p-2 -ml-2">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <button onClick={() => setShowSidebar(!showSidebar)} className="p-2">
            <Menu className="w-5 h-5 text-foreground" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center overflow-hidden">
            <svg width="32" height="32" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="200" rx="100" fill="white"/><ellipse cx="100" cy="85" rx="55" ry="45" fill="black"/><ellipse cx="82" cy="80" rx="6" ry="6" fill="white"/><ellipse cx="118" cy="80" rx="6" ry="6" fill="white"/><rect x="70" y="124" width="60" height="19" rx="9.5" fill="black" stroke="white" strokeWidth="4"/></svg>
          </div>
          <span className="font-bold text-primary">WizAi</span>
          {hasPremium && (
            <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-semibold">PRO</span>
          )}
        </div>
        <button
          className="p-2 -mr-2 relative"
          onClick={() => { setShowNotifications(!showNotifications); }}
        >
          <Bell className="w-5 h-5 text-foreground" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] rounded-full flex items-center justify-center font-bold">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Notifications Panel */}
      {showNotifications && (
        <WizAiNotificationsPanel
          notifications={notifications}
          onClose={() => setShowNotifications(false)}
          onMarkRead={handleMarkAllRead}
        />
      )}

      {/* Sidebar */}
      {showSidebar && (
        <WizAiChatSidebar
          sessions={sessions}
          activeId={activeChatId}
          onSelect={handleSelectChat}
          onNew={handleNewChat}
          onDelete={handleDeleteChat}
          onClose={() => setShowSidebar(false)}
        />
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 relative">
        {showWelcome && (
          <div className="absolute inset-x-0 top-[20%] text-center px-4 animate-fade-in">
            <p className="text-primary text-lg font-medium italic">
              I'm WizAi — how may I assist you? 🤖
            </p>
            {!hasPremium && (
              <p className="text-xs text-muted-foreground mt-2">
                Upgrade to Pro for image uploads & more!
              </p>
            )}
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
                {message.imageUrl && (
                  <img
                    src={message.imageUrl}
                    alt="Uploaded"
                    className="rounded-lg mb-2 max-h-48 object-cover"
                  />
                )}
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
            title={hasPremium ? 'Upload image' : 'Premium feature'}
          >
            {hasPremium ? (
              <ImagePlus className="w-5 h-5 text-primary" />
            ) : (
              <Plus className="w-5 h-5 text-primary" />
            )}
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
