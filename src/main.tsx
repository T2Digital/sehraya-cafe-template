import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';
import { initTenantBootstrap } from './tenantBootstrap';

initTenantBootstrap();

// Register PWA Service Worker manually to ensure fast caching updates
const updateSW = registerSW({
  onNeedRefresh() {
    // We could show a toast here to inform user to refresh for new content
  },
  onOfflineReady() {
    console.log('App is ready for offline work');
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
