import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import App from './App';
import { IndustrialProfileProvider } from './context/IndustrialProfileContext';
import { connectWebSocket } from './core/realtime';
import { startContinuousSync } from './core/continuousSync';
import './styles/industrial.css';

function Bootstrap() {
  useEffect(() => {
    connectWebSocket();
    startContinuousSync();
    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    }
  }, []);

  return (
    <IndustrialProfileProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </IndustrialProfileProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Bootstrap />
  </StrictMode>
);
