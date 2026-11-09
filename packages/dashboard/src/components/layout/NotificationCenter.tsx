import React from 'react';
import { X, CheckCircle, AlertTriangle, GitCommit, Cloud, ShieldCheck, Brain } from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext.js';
import type { NotificationType } from '@nimo-deck/shared';

export const NotificationCenter: React.FC = () => {
  const {
    isNotificationCenterOpen,
    setNotificationCenterOpen,
    notifications,
    markNotificationRead
  } = useDashboard();

  if (!isNotificationCenterOpen) return null;

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'COMMIT':
        return <GitCommit size={16} color="var(--deck-accent-blue)" />;
      case 'BACKUP':
        return <Cloud size={16} color="var(--deck-success)" />;
      case 'BACKUP_FAILED':
      case 'SYNC_CONFLICT':
      case 'SECURITY':
        return <AlertTriangle size={16} color="var(--deck-danger)" />;
      case 'AI_ANALYSIS':
        return <Brain size={16} color="var(--deck-accent-blue-light)" />;
      case 'RECOVERY':
        return <ShieldCheck size={16} color="var(--deck-warning)" />;
      default:
        return <CheckCircle size={16} color="var(--deck-accent-blue)" />;
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: '60px',
        right: '24px',
        width: '380px',
        maxHeight: 'calc(100vh - 80px)',
        backgroundColor: 'var(--deck-bg-surface)',
        border: '1px solid var(--deck-border)',
        borderRadius: 'var(--deck-radius-lg)',
        boxShadow: 'var(--deck-shadow-lg)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '14px 16px',
          borderBottom: '1px solid var(--deck-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <span style={{ fontSize: '14px', fontWeight: 600 }}>Notifications</span>
        <button
          onClick={() => setNotificationCenterOpen(false)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--deck-text-muted)',
            cursor: 'pointer',
            padding: '2px',
            display: 'flex'
          }}
        >
          <X size={16} />
        </button>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {notifications.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--deck-text-muted)', fontSize: '13px' }}>
            No notifications
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => markNotificationRead(n.id)}
              style={{
                display: 'flex',
                gap: '12px',
                padding: '12px',
                borderRadius: 'var(--deck-radius-md)',
                backgroundColor: n.read ? 'transparent' : 'var(--deck-accent-blue-subtle)',
                marginBottom: '4px',
                cursor: 'pointer',
                transition: 'background-color 0.1s ease'
              }}
            >
              <div style={{ marginTop: '2px' }}>{getIcon(n.type)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <h4 style={{ margin: '0 0 2px 0', fontSize: '13px', fontWeight: 600 }}>{n.title}</h4>
                  <span style={{ fontSize: '11px', color: 'var(--deck-text-muted)' }}>
                    {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--deck-text-secondary)', lineHeight: 1.4 }}>
                  {n.message}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
