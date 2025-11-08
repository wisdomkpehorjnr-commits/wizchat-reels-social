import { useState } from 'react';
import { ArrowLeft, Bell, Send, Plus, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
// REMOVE: import wizAiHead from '@/assets/wizai-head.svg';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface WizAiChatProps {
  onClose: () => void;
}

const CREATOR_QA = [
  {
    q: /who\s+created\s+you|who\s+is\s+your\s+creator|who\s+made\s+you/i,
    a: 'A young man called Wisdom Kpehor Jnr.'
  },
  {
    q: /where.*school|which.*school.*owner|which.*school.*wisdom/i,
    a: 'Wisdom Kpehor Jnr attended Symm Educational School Complex, Good Shepherd International School, and is currently at Wesley Grammar Senior High School.'
  },
  {
    q: /how.*old.*owner|owner.*age|creator.*age|how old.*wisdom/i,
    a: 'I can\'t share this with you, I\'m sorry 😔... But wait! I can help you contact him.'
  },
  {
    q: /contact.*him|reach.*owner|contact.*creator/i,
    a: 'Look in the Settings button... information about him can be reached there 😁.'
  }
];

const SYSTEM_PROMPT = `You are WizAi, the smart assistant inside the WizChat app. You know all features: chat list with previews, dark/light theme, image upload (for Pro users), pinned WizAi chat, sending reels, feed, profile, settings, etc. Always give friendly, helpful answers in very clear simple English. Use emojis sometimes 😊. When asked about this app, answer perfectly and up-to-date based on real functionality. Do NOT make up features that do not exist.`;

const deepseekCall = async (userInput: string) => {
  const apiKey = 'sk-07a368dce80942cda3aeae7cdebd3491';
  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userInput }
        ],
        temperature: 0.7,
        max_tokens: 512
      })
    });
    if (!response.ok) throw new Error('DeepSeek API error');
    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch (err) {
    return null;
  }
};

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

    // Creator Q&A check
    const match = CREATOR_QA.find(({ q }) => q.test(inputValue));
    if (match) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: match.a,
        timestamp: new Date()
      }]);
      setIsThinking(false);
      return;
    }

    // Otherwise, call DeepSeek
    const aiReply = await deepseekCall(userMessage.content);
    setMessages(prev => [...prev, {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: aiReply || "Hmm, let me think… can you rephrase that?",
      timestamp: new Date()
    }]);
    setIsThinking(false);
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
            <svg width="32" height="32" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="200" rx="100" fill="white"/><ellipse cx="100" cy="85" rx="55" ry="45" fill="black"/><ellipse cx="82" cy="80" rx="6" ry="6" fill="white"/><ellipse cx="118" cy="80" rx="6" ry="6" fill="white"/><rect x="70" y="124" width="60" height="19" rx="9.5" fill="black" stroke="white" stroke-width="4"/></svg>
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
