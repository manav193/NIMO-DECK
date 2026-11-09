import React from 'react';
import { Inbox, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button.js';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = <Inbox size={36} color="var(--deck-text-muted)" />,
  title,
  description,
  action
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        textAlign: 'center',
        backgroundColor: 'var(--deck-bg-card)',
        borderRadius: 'var(--deck-radius-lg)',
        border: '1px dashed var(--deck-border)'
      }}
    >
      <div style={{ marginBottom: '16px' }}>{icon}</div>
      <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: 600 }}>{title}</h4>
      <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: 'var(--deck-text-muted)', maxWidth: '360px' }}>
        {description}
      </p>
      {action && (
        <Button onClick={action.onClick} size="sm">
          {action.label}
        </Button>
      )}
    </div>
  );
};

export const LoadingSkeleton: React.FC<{ rows?: number; height?: number }> = ({ rows = 4, height = 24 }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', padding: '12px 0' }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          style={{
            height: `${height}px`,
            width: i === 0 ? '60%' : i === rows - 1 ? '40%' : '100%',
            backgroundColor: 'var(--deck-bg-surface-elevated)',
            borderRadius: 'var(--deck-radius-sm)',
            opacity: 0.6
          }}
        />
      ))}
    </div>
  );
};

export const ErrorBanner: React.FC<{
  title?: string;
  message: string;
  onRetry?: () => void;
}> = ({ title = 'Failed to load content', message, onRetry }) => {
  return (
    <div
      style={{
        padding: '16px',
        backgroundColor: 'var(--deck-danger-subtle)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        borderRadius: 'var(--deck-radius-md)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        margin: '12px 0'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <AlertTriangle size={18} color="var(--deck-danger)" />
        <div>
          <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--deck-danger)' }}>
            {title}:{' '}
          </span>
          <span style={{ fontSize: '13px', color: 'var(--deck-text-primary)' }}>{message}</span>
        </div>
      </div>
      {onRetry && (
        <Button size="sm" variant="secondary" onClick={onRetry} icon={<RefreshCw size={14} />}>
          Retry
        </Button>
      )}
    </div>
  );
};
