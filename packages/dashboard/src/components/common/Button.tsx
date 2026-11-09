import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  disabled,
  style,
  className = '',
  ...props
}) => {
  const getStyles = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      borderRadius: 'var(--deck-radius-md)',
      fontWeight: 500,
      cursor: disabled || loading ? 'not-allowed' : 'pointer',
      opacity: disabled || loading ? 0.6 : 1,
      transition: 'all 0.15s ease',
      border: '1px solid transparent',
      outline: 'none',
      fontFamily: 'inherit'
    };

    // Size
    switch (size) {
      case 'sm':
        base.padding = '6px 12px';
        base.fontSize = '12px';
        break;
      case 'lg':
        base.padding = '12px 24px';
        base.fontSize = '15px';
        break;
      default:
        base.padding = '8px 16px';
        base.fontSize = '13px';
        break;
    }

    // Variant
    switch (variant) {
      case 'secondary':
        base.backgroundColor = 'var(--deck-bg-surface-elevated)';
        base.color = 'var(--deck-text-primary)';
        base.borderColor = 'var(--deck-border)';
        break;
      case 'danger':
        base.backgroundColor = 'var(--deck-danger)';
        base.color = '#ffffff';
        break;
      case 'ghost':
        base.backgroundColor = 'transparent';
        base.color = 'var(--deck-text-secondary)';
        break;
      default:
        base.backgroundColor = 'var(--deck-accent-blue)';
        base.color = '#ffffff';
        break;
    }

    return base;
  };

  return (
    <button
      style={{ ...getStyles(), ...style }}
      disabled={disabled || loading}
      className={`deck-btn ${className}`}
      {...props}
    >
      {loading ? (
        <span
          style={{
            display: 'inline-block',
            width: '12px',
            height: '12px',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            borderTopColor: '#ffffff',
            borderRadius: '50%',
            animation: 'deck-spin 0.6s linear infinite'
          }}
        />
      ) : (
        icon
      )}
      {children}
    </button>
  );
};
