import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initializeOfflineMode } from './lib/offlineConfig'

// Initialize offline-first mode
initializeOfflineMode().catch(console.error);

// --- Service Worker registration with auto-update ---
const isInIframe = (() => { try { return window.self !== window.top; } catch { return true; } })();
const isPreviewHost = window.location.hostname.includes('id-preview--') || window.location.hostname.includes('lovableproject.com');

let swUpdateAvailable = false;
let waitingSW: ServiceWorker | null = null;

function onSwUpdate() {
  swUpdateAvailable = true;
  window.dispatchEvent(new CustomEvent('sw-update-available'));
}

if ('serviceWorker' in navigator && !isInIframe && !isPreviewHost) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/service-worker.js');

      // Check for updates every 60 seconds
      setInterval(() => reg.update(), 60_000);

      reg.addEventListener('updatefound', () => {
        const newSW = reg.installing;
        if (!newSW) return;
        newSW.addEventListener('statechange', () => {
          if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
            waitingSW = newSW;
            onSwUpdate();
          }
        });
      });

      // If a waiting SW already exists on load
      if (reg.waiting && navigator.serviceWorker.controller) {
        waitingSW = reg.waiting;
        onSwUpdate();
      }

      // Reload when the new SW takes over
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    } catch { /* SW registration failed silently */ }
  });
} else if (isPreviewHost || isInIframe) {
  navigator.serviceWorker?.getRegistrations().then(regs => regs.forEach(r => r.unregister()));
}

// Export for use by PwaUpdateNotification
export function activateSwUpdate() {
  if (waitingSW) {
    waitingSW.postMessage({ type: 'SKIP_WAITING' });
  }
}

export function isSwUpdateAvailable() {
  return swUpdateAvailable;
}

createRoot(document.getElementById("root")!).render(<App />);
