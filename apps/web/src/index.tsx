import React from 'react';
import { createRoot } from 'react-dom/client';
import {
  DashboardApp,
  DashboardProvider,
  DashboardService,
  HttpDashboardTransport,
  MockDashboardTransport
} from '@nimo-deck/dashboard';

// Configure transport: allow ?mock=true query param or fallback
const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
const useMock = params.get('mock') === 'true';
const token = params.get('token') || (typeof localStorage !== 'undefined' ? localStorage.getItem('deck_token') : null) || undefined;

const transport = useMock
  ? new MockDashboardTransport()
  : new HttpDashboardTransport({
      baseUrl: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
      authToken: token
    });

const service = new DashboardService(transport);

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <DashboardProvider service={service}>
        <DashboardApp />
      </DashboardProvider>
    </React.StrictMode>
  );
}
