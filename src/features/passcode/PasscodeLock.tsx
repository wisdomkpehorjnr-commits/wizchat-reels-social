import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { passcode } from './passcodeStore';
import { Lock, Delete } from 'lucide-react';
import Logo from '@/components/Logo';

/**
 * Full-screen lock overlay shown when the user has 2FA/passcode enabled
 * and the current browser session hasn't been unlocked yet.
 */
const PasscodeLock: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [locked, setLocked] = useState<boolean>(() => {
    if (!user?.id) return false;
    return passcode.isEnabled(user.id) && !passcode.isUnlocked(user.id);
  });

  useEffect(() => {
    if (!user?.id) {
      setLocked(false);
      return;
    }
    setLocked(passcode.isEnabled(user.id) && !passcode.isUnlocked(user.id));
  }, [user?.id]);

  useEffect(() => {
    if (pin.length !== 6 || !user?.id) return;
    (async () => {
      const ok = await passcode.verify(user.id, pin);
      if (ok) {
        setLocked(false);
        setPin('');
        setError(false);
      } else {
        setError(true);
        setTimeout(() => { setPin(''); setError(false); }, 500);
      }
    })();
  }, [pin, user?.id]);

  if (!locked || !user) return <>{children}</>;

  const digits = '123456789'.split('').concat(['', '0', 'del']);

  return (
    <div className="fixed inset-0 z-[9999] bg-background flex flex-col items-center justify-center p-6">
      <div className="mb-6"><Logo size="lg" /></div>
      <div className="flex items-center gap-2 mb-2 text-foreground">
        <Lock className="w-5 h-5" />
        <h1 className="text-xl font-semibold">Enter your passcode</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-8">6-digit code required to unlock WizchatPro</p>

      <div className={`flex gap-2.5 mb-10 ${error ? 'animate-pulse' : ''}`}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className={`w-3.5 h-3.5 rounded-full border-2 transition-colors ${
              error
                ? 'border-destructive bg-destructive'
                : i < pin.length
                  ? 'border-primary bg-primary'
                  : 'border-muted-foreground/40'
            }`}
          />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4 w-full max-w-[280px]">
        {digits.map((d, i) => {
          if (d === '') return <div key={i} />;
          if (d === 'del') {
            return (
              <button
                key={i}
                onClick={() => setPin(p => p.slice(0, -1))}
                className="h-16 rounded-full bg-muted text-foreground flex items-center justify-center active:scale-95 transition-transform"
              >
                <Delete className="w-6 h-6" />
              </button>
            );
          }
          return (
            <button
              key={i}
              onClick={() => setPin(p => (p.length < 6 ? p + d : p))}
              className="h-16 rounded-full bg-muted text-foreground text-2xl font-semibold active:scale-95 transition-transform hover:bg-muted/70"
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PasscodeLock;
