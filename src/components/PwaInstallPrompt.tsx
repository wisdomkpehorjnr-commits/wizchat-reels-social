import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download } from 'lucide-react';

const PWA_DISMISS_KEY = 'wizchat_pwa_dismiss_ts';
const DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const PwaInstallPrompt: React.FC = () => {
  const [show, setShow] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    try { if (window.self !== window.top) return; } catch { return; }
    try {
      const ts = localStorage.getItem(PWA_DISMISS_KEY);
      if (ts && Date.now() - parseInt(ts, 10) < DISMISS_COOLDOWN_MS) return;
    } catch {}

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    const timer = setTimeout(() => setShow(true), 4000);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      clearTimeout(timer);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setInstalled(true);
        setShow(false);
      }
      setDeferredPrompt(null);
    } else {
      setShow(false);
    }
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setShow(false);
    try { localStorage.setItem(PWA_DISMISS_KEY, String(Date.now())); } catch {}
  }, []);

  if (installed) return null;

  return (
    <AnimatePresence>
      {show && (
        <>
          <motion.div
            className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleDismiss}
          />
          <motion.div
            className="fixed inset-0 z-[101] flex items-center justify-center p-6 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="pointer-events-auto w-full max-w-sm rounded-3xl border border-border/50 px-7 py-8 text-center shadow-2xl"
              style={{
                background: 'hsl(var(--card) / 0.85)',
                backdropFilter: 'blur(28px)',
                WebkitBackdropFilter: 'blur(28px)',
              }}
              initial={{ opacity: 0, y: 30, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.96 }}
              transition={{ type: 'spring', damping: 24, stiffness: 280 }}
            >
              <div className="flex justify-center mb-5">
                <img
                  src="/lovable-uploads/3af45968-ee0a-4afb-9557-c058030ab8dc.png"
                  alt="WizChat"
                  className="w-16 h-16 rounded-2xl shadow-lg"
                />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">Install WizChat</h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-7">
                Add WizChat to your home screen for a faster, full-screen experience that works offline.
              </p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleInstall}
                  className="w-full py-3 rounded-full font-semibold text-sm bg-foreground text-background hover:opacity-90 transition-opacity active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Install
                </button>
                <button
                  onClick={handleDismiss}
                  className="w-full py-3 rounded-full font-medium text-sm text-muted-foreground hover:bg-muted transition-colors"
                >
                  Not now
                </button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default PwaInstallPrompt;
