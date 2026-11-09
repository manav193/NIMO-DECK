import React from 'react';
import { Sidebar } from './layout/Sidebar.js';
import { Header } from './layout/Header.js';
import { CommandPalette } from './layout/CommandPalette.js';
import { NotificationCenter } from './layout/NotificationCenter.js';
import { OnboardingWizard } from './onboarding/OnboardingWizard.js';

// Views
import { OverviewView } from './views/OverviewView.js';
import { ProjectsView } from './views/ProjectsView.js';
import { RepositoryExplorerView } from './views/RepositoryExplorerView.js';
import { ActivityTimelineView } from './views/ActivityTimelineView.js';
import { GitHubSyncView } from './views/GitHubSyncView.js';
import { GoogleDriveView } from './views/GoogleDriveView.js';
import { IntelligenceView } from './views/IntelligenceView.js';
import { RoadmapsView } from './views/RoadmapsView.js';
import { ProjectHistoryView } from './views/ProjectHistoryView.js';
import { VaultView } from './views/VaultView.js';
import { SettingsView } from './views/SettingsView.js';
import { ProjectWorkspace } from './workspace/ProjectWorkspace.js';

import { useDashboard } from '../context/DashboardContext.js';

export const DashboardApp: React.FC = () => {
  const { activeView, selectedProjectId } = useDashboard();

  const renderContent = () => {
    if (selectedProjectId) {
      return <ProjectWorkspace />;
    }

    switch (activeView) {
      case 'overview':
        return <OverviewView />;
      case 'projects':
        return <ProjectsView />;
      case 'explorer':
        return <RepositoryExplorerView />;
      case 'timeline':
        return <ActivityTimelineView />;
      case 'github':
        return <GitHubSyncView />;
      case 'drive':
        return <GoogleDriveView />;
      case 'intelligence':
        return <IntelligenceView />;
      case 'roadmaps':
        return <RoadmapsView />;
      case 'history':
        return <ProjectHistoryView />;
      case 'vault':
        return <VaultView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <OverviewView />;
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        backgroundColor: 'var(--deck-bg-navy)',
        color: 'var(--deck-text-primary)'
      }}
    >
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Header />
        <main
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
            maxWidth: '1440px',
            width: '100%',
            margin: '0 auto'
          }}
        >
          {renderContent()}
        </main>
      </div>

      <CommandPalette />
      <NotificationCenter />
      <OnboardingWizard />
    </div>
  );
};
