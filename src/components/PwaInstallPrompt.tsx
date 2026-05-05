import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Home, Zap, WifiOff, Bell, Palette, HardDrive } from 'lucide-react';

const PWA_DISMISS_KEY = 'wizchat_pwa_dismiss_ts';
const DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const PwaInstallPrompt: React.FC = () => {
  const [show, setShow] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Check if already running as standalone PWA
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    // Check if in iframe (Lovable preview)
    try { if (window.self !== window.top) return; } catch { return; }

    // Check cooldown
    try {
      const ts = localStorage.getItem(PWA_DISMISS_KEY);
      if (ts && Date.now() - parseInt(ts, 10) < DISMISS_COOLDOWN_MS) return;
    } catch {}

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Show after 4 seconds
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
      // Fallback: just close and let user use browser menu
      setShow(false);
    }
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setShow(false);
    try { localStorage.setItem(PWA_DISMISS_KEY, String(Date.now())); } catch {}
  }, []);

  if (installed) return null;

  const benefits = [
    { icon: Home, text: 'Launch from your home screen like a real app' },
    { icon: Zap, text: 'Lightning-fast performance with caching' },
    { icon: WifiOff, text: 'Works offline — chat without internet' },
    { icon: Bell, text: 'Never miss a message with notifications' },
    { icon: Palette, text: 'Pure glass UI with buttery animations' },
    { icon: HardDrive, text: 'Takes less space than traditional apps' },
  ];

  return (
    <AnimatePresence>
      {show && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleDismiss}
          />

          {/* Glass popup */}
          <motion.div
            className="fixed inset-x-4 z-[101] top-1/2 -translate-y-1/2 max-w-md mx-auto rounded-3xl border border-white/20 p-6 shadow-2xl"
            style={{
              background: 'rgba(255,255,255,0.08)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
            }}
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* Close button */}
            <button
              onClick={handleDismiss}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5 text-white/70" />
            </button>

            {/* Logo */}
            <div className="flex justify-center mb-4">
              <img
                src="/lovable-uploads/3af45968-ee0a-4afb-9557-c058030ab8dc.png"
                alt="WizChat"
                className="w-16 h-16 rounded-2xl shadow-lg"
              />
            </div>

            {/* Title */}
            <h2 className="text-xl font-bold text-white text-center mb-1">
              🚀 Go Native with WizChat
            </h2>
            <p className="text-sm text-white/70 text-center mb-5 leading-relaxed">
              You're experiencing WizChat in your browser. Install our Progressive Web App and get the full social experience — faster, smoother, and always with you.
            </p>

            {/* Benefits */}
            <div className="space-y-3 mb-6">
              {benefits.map((b, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                    <b.icon className="w-4 h-4 text-white/90" />
                  </div>
                  <span className="text-sm text-white/85">{b.text}</span>
                </div>
              ))}
            </div>

            {/* Buttons */}
            <div className="flex flex-col gap-2">
              <button
                onClick={handleInstall}
                className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg hover:shadow-green-500/30 transition-all active:scale-[0.98]"
              >
                💾 Install WizChat
              </button>
              <button
                onClick={handleDismiss}
                className="w-full py-3 rounded-xl font-medium text-sm text-white/60 hover:text-white/80 hover:bg-white/5 transition-colors"
              >
                ⏰ Remind me later
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default PwaInstallPrompt;
