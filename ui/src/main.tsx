import * as Sentry from '@sentry/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app';
import './index.css';
import { initGa } from './utils/analytics';
import { STALE_TIME_MS } from './utils/api';
import { currentInstance } from './utils/constants';

// One GA4 data stream per region: each subdomain uses its stream's measurement ID.
if (currentInstance.gaMeasurementId) {
  initGa(currentInstance.gaMeasurementId);
}

// Sentry error tracking.
if (currentInstance.sentryDsn) {
  Sentry.init({
    dsn: currentInstance.sentryDsn,
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: STALE_TIME_MS,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
);
