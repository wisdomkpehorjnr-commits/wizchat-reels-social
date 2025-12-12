import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initializeOfflineMode } from './lib/offlineConfig'

// Initialize offline-first mode
initializeOfflineMode().catch(console.error);

createRoot(document.getElementById("root")!).render(<App />);
