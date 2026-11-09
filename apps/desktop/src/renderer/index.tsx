import React from 'react';
import { createRoot } from 'react-dom/client';
import {
  DashboardApp,
  DashboardProvider,
  DashboardService,
  IpcDashboardTransport
} from '@nimo-deck/dashboard';
import '@nimo-deck/dashboard/theme.css';

const transport = new IpcDashboardTransport();
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
