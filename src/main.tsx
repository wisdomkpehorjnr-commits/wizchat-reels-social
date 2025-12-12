import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initializeOfflineMode } from './lib/offlineConfig'
import CacheEngine from '@/core/cacheEngine'
import { ErrorBoundary } from '@/ui/ErrorBoundary'

// Initialize offline-first mode and prewarm minimal caches
initializeOfflineMode().catch(console.error);

async function prewarm() {
	try {
		// ensure IndexedDB is ready
		await CacheEngine.set('__prewarm__', { ts: Date.now() });
	} catch (e) {
		console.debug('[prewarm] failed', e);
	}
}

prewarm().catch(() => {});

createRoot(document.getElementById("root")!).render(
	<ErrorBoundary>
		<App />
	</ErrorBoundary>
);
