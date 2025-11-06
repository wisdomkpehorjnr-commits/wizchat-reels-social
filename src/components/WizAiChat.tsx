import { useState } from 'react';
import { ArrowLeft, Bell, Send, Plus, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface WizAiChatProps {
  onClose: () => void;
}

const WizAiChat = ({ onClose }: WizAiChatProps) => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);

  const handleSend = async () => {
    if (!inputValue.trim()) return;

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

    try {
      // Call the WizAi edge function
      const response = await fetch(
        'https://cgydbjsuhwsnqsiskmex.supabase.co/functions/v1/wizai-chat',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNneWRianN1aHdzbnFzaXNrbWV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNTI5MTgsImV4cCI6MjA2ODYyODkxOH0.eCdvFODSW4VSRjgYf6me2fTVsGTmhv_P7uWWgJYD8ak'}`,
          },
          body: JSON.stringify({ message: inputValue }),
        }
      );

      const data = await response.json();
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || "I'm here to help! Ask me anything about the app, business, studies, social life, or just for fun! 😊",
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error calling WizAi:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Oops! I had trouble processing that. Can you try again? 🤔",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
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
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary-foreground" />
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
              Am WizAi — how may I assist you?
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
                <p className="text-sm">{message.content}</p>
              </div>
            </div>
          ))}

          {isThinking && (
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
        </div>
      </div>

      {/* Input Card */}
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
            placeholder="Type your question..."
            className="flex-1 border-2 border-primary"
          />
          <Button
            onClick={handleSend}
            disabled={!inputValue.trim()}
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
