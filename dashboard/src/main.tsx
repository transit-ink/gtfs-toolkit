import * as Sentry from '@sentry/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app';
import './index.css';
import { currentInstance } from './utils/constants';

if (currentInstance.sentryDsn) {
  Sentry.init({
    dsn: currentInstance.sentryDsn,
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
