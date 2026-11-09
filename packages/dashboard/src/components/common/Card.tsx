import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'subtle';
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  action,
  children,
  variant = 'default',
  style,
  className = '',
  ...props
}) => {
  const getBg = () => {
    switch (variant) {
      case 'elevated':
        return 'var(--deck-bg-surface-elevated)';
      case 'subtle':
        return 'var(--deck-accent-blue-subtle)';
      default:
        return 'var(--deck-bg-surface)';
    }
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: getBg(),
    border: '1px solid var(--deck-border)',
    borderRadius: 'var(--deck-radius-lg)',
    padding: '20px',
    boxShadow: variant === 'elevated' ? 'var(--deck-shadow-md)' : 'var(--deck-shadow-sm)',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
    ...style
  };

  return (
    <div style={cardStyle} className={`deck-card ${className}`} {...props}>
      {(title || subtitle || action) && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '16px',
            gap: '12px'
          }}
        >
          <div>
            {title && (
              <h3
                style={{
                  margin: 0,
                  fontSize: '16px',
                  fontWeight: 600,
                  color: 'var(--deck-text-primary)',
                  letterSpacing: '-0.01em'
                }}
              >
                {title}
              </h3>
            )}
            {subtitle && (
              <p
                style={{
                  margin: '4px 0 0 0',
                  fontSize: '13px',
                  color: 'var(--deck-text-muted)'
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
};
