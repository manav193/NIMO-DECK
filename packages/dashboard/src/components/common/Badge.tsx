import React from 'react';

export type BadgeVariant = 'blue' | 'green' | 'amber' | 'red' | 'neutral';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  dot?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'blue',
  size = 'md',
  dot = false,
  style,
  className = ''
}) => {
  const getColors = () => {
    switch (variant) {
      case 'green':
        return { bg: 'var(--deck-success-subtle)', text: 'var(--deck-success)', border: 'rgba(16, 185, 129, 0.25)' };
      case 'amber':
        return { bg: 'var(--deck-warning-subtle)', text: 'var(--deck-warning)', border: 'rgba(245, 158, 11, 0.25)' };
      case 'red':
        return { bg: 'var(--deck-danger-subtle)', text: 'var(--deck-danger)', border: 'rgba(239, 68, 68, 0.25)' };
      case 'neutral':
        return { bg: 'var(--deck-bg-surface-elevated)', text: 'var(--deck-text-secondary)', border: 'var(--deck-border)' };
      default:
        return { bg: 'var(--deck-accent-blue-subtle)', text: 'var(--deck-accent-blue-light)', border: 'rgba(59, 130, 246, 0.25)' };
    }
  };

  const colors = getColors();

  return (
    <span
      className={`deck-badge ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: size === 'sm' ? '2px 8px' : '4px 10px',
        fontSize: size === 'sm' ? '11px' : '12px',
        fontWeight: 600,
        borderRadius: 'var(--deck-radius-sm)',
        backgroundColor: colors.bg,
        color: colors.text,
        border: `1px solid ${colors.border}`,
        letterSpacing: '0.02em',
        textTransform: 'uppercase',
        lineHeight: 1,
        ...style
      }}
    >
      {dot && (
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: colors.text
          }}
        />
      )}
      {children}
    </span>
  );
};
