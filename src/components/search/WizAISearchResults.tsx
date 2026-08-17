import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Sparkles, Send, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { streamWizAiChat } from '@/services/wizaiService';

interface WizAISearchResultsProps {
  query: string;
  onClose: () => void;
}

interface Turn {
  question: string;
  answer: string;
  error?: string;
}

/**
 * Dedicated full-screen "Search with WizAI" answer page.
 * Distinct from the plain results list: branded AI answer layout with a
 * streaming answer card and a follow-up input to keep the conversation going.
 */
const WizAISearchResults: React.FC<WizAISearchResultsProps> = ({ query, onClose }) => {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [followUp, setFollowUp] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  const ask = async (question: string, history: Turn[]) => {
    setStreaming(true);
    setTurns([...history, { question, answer: '' }]);

    const messages = [
      ...history.flatMap((t) => [
        { role: 'user', content: t.question },
        { role: 'assistant', content: t.answer },
      ]),
      { role: 'user', content: question },
    ];

    try {
      await streamWizAiChat({
        messages,
        onDelta: (delta) => {
          setTurns((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last) next[next.length - 1] = { ...last, answer: last.answer + delta };
            return next;
          });
        },
        onDone: () => setStreaming(false),
        onError: (err) => {
          setTurns((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last) next[next.length - 1] = { ...last, error: err };
            return next;
          });
          setStreaming(false);
        },
      });
    } catch {
      setTurns((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last) next[next.length - 1] = { ...last, error: 'Could not reach WizAI right now.' };
        return next;
      });
      setStreaming(false);
    }
  };

  useEffect(() => {
    if (startedRef.current || !query.trim()) return;
    startedRef.current = true;
    ask(query.trim(), []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const submitFollowUp = (e: React.FormEvent) => {
    e.preventDefault();
    const q = followUp.trim();
    if (!q || streaming) return;
    setFollowUp('');
    ask(q, turns);
  };

  return (
    <motion.div
      className="fixed inset-0 z-[210] bg-background flex flex-col"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      transition={{ type: 'spring', damping: 28, stiffness: 320 }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-border/60 bg-gradient-to-r from-primary/15 to-transparent backdrop-blur-xl">
        <span className="h-8 w-8 rounded-xl bg-primary/20 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-primary" />
        </span>
        <span className="text-base font-semibold text-foreground">WizAI Search</span>
        <div className="flex-1" />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close WizAI search"
          className="h-9 w-9 rounded-full bg-foreground/10 border border-foreground/15 flex items-center justify-center text-foreground transition-transform active:scale-95"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Answers */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto no-scrollbar px-4 py-4 space-y-6"
        style={{ WebkitOverflowScrolling: 'touch' as any, overscrollBehavior: 'contain' }}
      >
        {turns.map((t, i) => (
          <div key={i} className="space-y-3">
            <h2 className="text-xl font-bold tracking-tight text-foreground">{t.question}</h2>
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
              {t.error ? (
                <p className="text-sm font-medium text-destructive">{t.error}</p>
              ) : t.answer ? (
                <div className="prose prose-sm dark:prose-invert max-w-none text-foreground">
                  <ReactMarkdown>{t.answer}</ReactMarkdown>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" /> WizAI is thinking…
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Follow-up input */}
      <form onSubmit={submitFollowUp} className="border-t border-border/60 p-3 flex items-center gap-2 bg-background">
        <input
          value={followUp}
          onChange={(e) => setFollowUp(e.target.value)}
          placeholder="Ask WizAI something else…"
          className="flex-1 h-11 rounded-full bg-foreground/5 border border-border/60 px-4 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/60"
        />
        <button
          type="submit"
          disabled={streaming || !followUp.trim()}
          aria-label="Send"
          className="h-11 w-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50 transition-transform active:scale-95"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </motion.div>
  );
};

export default WizAISearchResults;
