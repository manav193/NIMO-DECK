import React from 'react';
import {
  LayoutDashboard,
  FolderGit2,
  FileCode2,
  Activity,
  Cloud,
  Brain,
  Milestone,
  History,
  ShieldCheck,
  Settings,
  ChevronLeft,
  ChevronRight,
  Terminal,
  Compass
} from 'lucide-react';
import { GithubIcon } from '../common/Icons.js';
import { useDashboard } from '../../context/DashboardContext.js';
import type { DashboardView } from '../../types/navigation.js';

interface NavItem {
  id: DashboardView;
  label: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={18} /> },
  { id: 'projects', label: 'Projects', icon: <FolderGit2 size={18} /> },
  { id: 'explorer', label: 'Repo Explorer', icon: <FileCode2 size={18} /> },
  { id: 'timeline', label: 'Activity Timeline', icon: <Activity size={18} /> },
  { id: 'github', label: 'GitHub Sync', icon: <GithubIcon size={18} /> },
  { id: 'drive', label: 'Google Drive', icon: <Cloud size={18} /> },
  { id: 'intelligence', label: 'AI Intelligence', icon: <Brain size={18} /> },
  { id: 'roadmaps', label: 'Roadmaps', icon: <Milestone size={18} /> },
  { id: 'history', label: 'Project History', icon: <History size={18} /> },
  { id: 'vault', label: 'Vault & Recovery', icon: <ShieldCheck size={18} /> },
  { id: 'settings', label: 'Settings', icon: <Settings size={18} /> }
];

export const Sidebar: React.FC = () => {
  const { activeView, setActiveView, isSidebarCollapsed, toggleSidebar, selectedProjectId, setOnboardingOpen } =
    useDashboard();

  return (
    <aside
      style={{
        width: isSidebarCollapsed ? '68px' : '240px',
        height: '100vh',
        backgroundColor: 'var(--deck-bg-surface)',
        borderRight: '1px solid var(--deck-border)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: 100,
        flexShrink: 0,
        userSelect: 'none'
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          padding: '18px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          borderBottom: '1px solid var(--deck-border)',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: 'var(--deck-radius-md)',
            backgroundColor: 'var(--deck-accent-blue)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            flexShrink: 0
          }}
        >
          <Terminal size={18} />
        </div>
        {!isSidebarCollapsed && (
          <div style={{ display: 'flex', flexDirection: 'column', whiteSpace: 'nowrap' }}>
            <span style={{ fontWeight: 700, fontSize: '15px', letterSpacing: '-0.02em', color: 'var(--deck-text-primary)' }}>
              NIMO-DECK
            </span>
            <span style={{ fontSize: '11px', color: 'var(--deck-text-muted)', fontWeight: 500 }}>
              Dev OS v0.7.0
            </span>
          </div>
        )}
      </div>

      {/* Navigation List */}
      <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {NAV_ITEMS.map((item) => {
          const isActive = activeView === item.id && !selectedProjectId;
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              title={isSidebarCollapsed ? item.label : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '9px 12px',
                borderRadius: 'var(--deck-radius-md)',
                border: 'none',
                background: isActive ? 'var(--deck-accent-blue-subtle)' : 'transparent',
                color: isActive ? 'var(--deck-accent-blue-light)' : 'var(--deck-text-secondary)',
                fontWeight: isActive ? 600 : 500,
                fontSize: '13px',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                transition: 'all 0.12s ease'
              }}
            >
              <span style={{ flexShrink: 0 }}>{item.icon}</span>
              {!isSidebarCollapsed && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Onboarding Quick Trigger & Collapse Controls */}
      <div style={{ padding: '8px', borderTop: '1px solid var(--deck-border)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <button
          onClick={() => setOnboardingOpen(true)}
          title={isSidebarCollapsed ? 'Setup Wizard' : undefined}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '8px 12px',
            borderRadius: 'var(--deck-radius-md)',
            border: 'none',
            background: 'transparent',
            color: 'var(--deck-text-muted)',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 500
          }}
        >
          <Compass size={18} />
          {!isSidebarCollapsed && <span>Setup Wizard</span>}
        </button>

        <button
          onClick={toggleSidebar}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: isSidebarCollapsed ? 'center' : 'flex-end',
            padding: '8px',
            borderRadius: 'var(--deck-radius-md)',
            border: 'none',
            background: 'transparent',
            color: 'var(--deck-text-muted)',
            cursor: 'pointer'
          }}
        >
          {isSidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>
    </aside>
  );
};
