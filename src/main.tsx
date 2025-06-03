import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Initialize Venly Connect
declare global {
  interface Window {
    VenlyConnect: any;
  }
}

// Check if we're in a browser environment
if (typeof window !== 'undefined') {
  // For npm package usage
  import('@venly/connect').then((VenlyConnect) => {
    window.venlyConnect = new VenlyConnect.default(
      import.meta.env.VITE_VENLY_CLIENT_ID,
      {
        environment: import.meta.env.VITE_VENLY_ENVIRONMENT as 'sandbox' | 'production'
      }
    );
    console.log('Venly Connect initialized');
  }).catch(err => {
    console.error('Failed to initialize Venly Connect:', err);
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);