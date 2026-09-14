import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { PlatformProvider } from './platform/container/PlatformContext.tsx';
import { GlobalErrorBoundary } from './components/GlobalErrorBoundary.tsx';
import { ThemeProvider } from './theme/ThemeProvider.tsx';
import { logger } from './utils/logger.ts';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PlatformProvider>
      <GlobalErrorBoundary>
        <ThemeProvider defaultTheme="dark">
          <App />
        </ThemeProvider>
      </GlobalErrorBoundary>
    </PlatformProvider>
  </StrictMode>
);

// Register Service Worker for PWA support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        logger.info(`ServiceWorker registration successful with scope: ${registration.scope}`);
      })
      .catch((err) => {
        logger.error('ServiceWorker registration failed', { error: err instanceof Error ? err.message : String(err) });
      });
  });
}
