import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import CacheEngine from '@/core/cacheEngine';
import { VirtualizedList } from '@/ui/VirtualizedList';
import supabase, { subscribeNewMessages } from '@/services/supabaseClient';
import { syncEngine } from '@/services/syncEngine';
import { networkController } from '@/core/networkController';

const BATCH_PAGE = 100;

export default function OptimizedChatRoom() {
  const { chatId } = useParams<{ chatId: string }>();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const listRef = useRef<any>(null);

  useEffect(() => {
    let mounted = true;
    async function loadCacheFirst() {
      if (!chatId) return;
      const cached = await CacheEngine.get<any[]>(`chat:${chatId}:messages`);
      if (mounted) {
        if (cached) setMessages(cached);
        setLoading(false);
      }
      // Fetch diffs since last updated
      const last = cached && cached.length ? cached[cached.length - 1].updatedAt || 0 : 0;
      try {
        const { data, error } = await supabase.from('messages').select('*').eq('chatId', chatId).order('created_at', { ascending: true }).limit(BATCH_PAGE);
        if (!error && data) {
          // Merge, but only append new ones (delta)
          const existingIds = new Set((cached || []).map(m => m.id));
          const newOnes = data.filter((d:any) => !existingIds.has(d.id));
          if (newOnes.length) {
            const merged = [...(cached || []), ...newOnes];
            await CacheEngine.set(`chat:${chatId}:messages`, merged);
            if (mounted) setMessages(merged);
          }
        }
      } catch (e) {
        console.debug('[OptimizedChat] fetch error', e);
      }
    }
    loadCacheFirst();
    return () => { mounted = false; };
  }, [chatId]);

  useEffect(() => {
    const unsub = subscribeNewMessages((msg) => {
      if (!msg || msg.chatId !== chatId) return;
      setMessages((prev) => {
        if (prev.find(p => p.id === msg.id)) return prev;
        const next = [...prev, msg];
        CacheEngine.set(`chat:${chatId}:messages`, next).catch(() => {});
        return next;
      });
    });
    return unsub;
  }, [chatId]);

  async function sendMessage() {
    if (!input.trim() || !chatId) return;
    const draft = { chatId, content: input.trim(), created_at: new Date().toISOString() };
    setInput('');
    // optimistic local append
    const tempId = `temp-${Date.now()}`;
    const optimistic = { ...draft, id: tempId, pending: true };
    setMessages((p) => { const next = [...p, optimistic]; CacheEngine.set(`chat:${chatId}:messages`, next).catch(()=>{}); return next; });
    try {
      const res = await supabase.from('messages').insert([draft]);
      // cleanup optimistic/pending
      setMessages((p) => {
        const merged = p.map(m => (m.id === tempId ? res.data?.[0] || { ...m, pending: false } : m));
        CacheEngine.set(`chat:${chatId}:messages`, merged).catch(()=>{});
        return merged;
      });
    } catch (e) {
      // offline -> queue
      await syncEngine.enqueue('messages', [draft]);
      setMessages((p) => p.map(m => (m.id === tempId ? { ...m, pending: true } : m)));
    }
  }

  const itemHeight = 72;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto h-[calc(100vh-12rem)] flex flex-col">
        <div className="flex-1">
          <VirtualizedList
            items={messages}
            itemHeight={itemHeight}
            renderItem={(msg:any) => (
              <div className={`p-3 ${msg.pending ? 'opacity-60' : ''}`}>
                <div className="text-sm">{msg.content}</div>
                <div className="text-xs text-muted-foreground">{new Date(msg.created_at || msg.createdAt || msg.createdAt).toLocaleTimeString()}</div>
              </div>
            )}
          />
        </div>
        <div className="p-4 border-t flex space-x-2">
          <Input value={input} onChange={(e:any) => setInput(e.target.value)} placeholder="Type a message..." onKeyDown={(e:any) => { if (e.key === 'Enter') sendMessage(); }} />
          <Button onClick={sendMessage}>Send</Button>
        </div>
      </div>
    </Layout>
  );
}
