import React from 'react';
import { Search, Bell, Sun, Moon, Command, Wifi } from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext.js';

export const Header: React.FC = () => {
  const {
    activeView,
    selectedProjectId,
    theme,
    toggleTheme,
    setCommandPaletteOpen,
    isNotificationCenterOpen,
    setNotificationCenterOpen,
    unreadNotificationsCount,
    service
  } = useDashboard();

  const transportType = service.getTransport().getTransportType();

  const getViewTitle = () => {
    if (selectedProjectId) return 'Project Workspace';
    switch (activeView) {
      case 'overview':
        return 'Developer Overview';
      case 'projects':
        return 'Projects Directory';
      case 'explorer':
        return 'Repository Explorer';
      case 'timeline':
        return 'Activity Timeline';
      case 'github':
        return 'GitHub Synchronization';
      case 'drive':
        return 'Google Drive Vault';
      case 'intelligence':
        return 'AI Codebase Intelligence';
      case 'roadmaps':
        return 'Development Roadmaps';
      case 'history':
        return 'Project History & Changelogs';
      case 'vault':
        return 'Vault & Disaster Recovery';
      case 'settings':
        return 'Settings & Security';
      default:
        return 'Command Center';
    }
  };

  return (
    <header
      style={{
        height: '60px',
        backgroundColor: 'var(--deck-bg-surface)',
        borderBottom: '1px solid var(--deck-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        flexShrink: 0
      }}
    >
      {/* Title & View Label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--deck-text-primary)' }}>
          {getViewTitle()}
        </h2>
        <span
          style={{
            fontSize: '11px',
            padding: '2px 8px',
            borderRadius: 'var(--deck-radius-sm)',
            backgroundColor: 'var(--deck-accent-blue-subtle)',
            color: 'var(--deck-accent-blue-light)',
            fontWeight: 600,
            textTransform: 'uppercase',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <Wifi size={11} /> {transportType.toUpperCase()}
        </span>
      </div>

      {/* Global Actions: Search Bar, Command Palette, Notifications, Theme */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Quick Search & Palette Trigger */}
        <button
          onClick={() => setCommandPaletteOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '6px 14px',
            backgroundColor: 'var(--deck-bg-navy)',
            border: '1px solid var(--deck-border)',
            borderRadius: 'var(--deck-radius-md)',
            color: 'var(--deck-text-muted)',
            fontSize: '13px',
            cursor: 'pointer',
            minWidth: '220px',
            textAlign: 'left'
          }}
        >
          <Search size={14} />
          <span style={{ flex: 1 }}>Search commands & files...</span>
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              fontSize: '11px',
              padding: '2px 6px',
              backgroundColor: 'var(--deck-bg-surface-elevated)',
              borderRadius: 'var(--deck-radius-sm)',
              border: '1px solid var(--deck-border)'
            }}
          >
            <Command size={10} /> K
          </span>
        </button>

        {/* Notification Bell */}
        <button
          onClick={() => setNotificationCenterOpen(!isNotificationCenterOpen)}
          title="Notification Center"
          style={{
            position: 'relative',
            width: '36px',
            height: '36px',
            borderRadius: 'var(--deck-radius-md)',
            border: '1px solid var(--deck-border)',
            background: isNotificationCenterOpen
              ? 'var(--deck-accent-blue-subtle)'
              : 'transparent',
            color: isNotificationCenterOpen
              ? 'var(--deck-accent-blue-light)'
              : 'var(--deck-text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <Bell size={16} />
          {unreadNotificationsCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: '6px',
                right: '6px',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: 'var(--deck-accent-blue)'
              }}
            />
          )}
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: 'var(--deck-radius-md)',
            border: '1px solid var(--deck-border)',
            background: 'transparent',
            color: 'var(--deck-text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
    </header>
  );
};
