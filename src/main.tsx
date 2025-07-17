import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.tsx';
import './index.css';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

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
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
);