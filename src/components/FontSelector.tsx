import { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';

const FONT_KEY = 'wizchat-app-font';

interface FontOption {
  id: string;
  label: string;
  family: string;
  googleHref?: string;
}

const FONTS: FontOption[] = [
  { id: 'system', label: 'System Default', family: 'system-ui, -apple-system, sans-serif' },
  { id: 'inter', label: 'Inter (Modern)', family: "'Inter', sans-serif", googleHref: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap' },
  { id: 'poppins', label: 'Poppins (Rounded)', family: "'Poppins', sans-serif", googleHref: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap' },
  { id: 'space-grotesk', label: 'Space Grotesk', family: "'Space Grotesk', sans-serif", googleHref: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap' },
  { id: 'playfair', label: 'Playfair (Elegant)', family: "'Playfair Display', serif", googleHref: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&display=swap' },
  { id: 'lora', label: 'Lora (Editorial)', family: "'Lora', serif", googleHref: 'https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&display=swap' },
  { id: 'jetbrains', label: 'JetBrains Mono', family: "'JetBrains Mono', monospace", googleHref: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap' },
  { id: 'nunito', label: 'Nunito (Friendly)', family: "'Nunito', sans-serif", googleHref: 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700&display=swap' },
];

const LINK_ID = 'wizchat-font-link';

function injectGoogleFont(href?: string) {
  const existing = document.getElementById(LINK_ID) as HTMLLinkElement | null;
  if (!href) { if (existing) existing.remove(); return; }
  if (existing && existing.href === href) return;
  if (existing) existing.remove();
  const link = document.createElement('link');
  link.id = LINK_ID;
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

export function applyAppFont(fontId: string) {
  const font = FONTS.find((f) => f.id === fontId) || FONTS[0];
  document.documentElement.style.setProperty('--app-font', font.family);
  injectGoogleFont(font.googleHref);
  try { localStorage.setItem(FONT_KEY, fontId); } catch {}
}

export function initAppFont() {
  try {
    const saved = localStorage.getItem(FONT_KEY) || 'inter';
    applyAppFont(saved);
  } catch { applyAppFont('inter'); }
}

const FontSelector = () => {
  const [current, setCurrent] = useState<string>(() => {
    try { return localStorage.getItem(FONT_KEY) || 'inter'; } catch { return 'inter'; }
  });

  useEffect(() => { applyAppFont(current); }, [current]);

  return (
    <div className="space-y-3">
      <Label>App Font</Label>
      <p className="text-sm text-muted-foreground">Pick a typography style for the whole app.</p>
      <div className="grid grid-cols-2 gap-2">
        {FONTS.map((f) => {
          const active = current === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setCurrent(f.id)}
              className={`text-left px-3 py-3 rounded-xl border transition-all ${
                active
                  ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                  : 'border-border bg-card hover:bg-muted'
              }`}
              style={{ fontFamily: f.family }}
            >
              <div className="text-sm font-semibold text-foreground">{f.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">The quick brown fox</div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default FontSelector;
