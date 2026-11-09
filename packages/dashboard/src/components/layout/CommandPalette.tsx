import React, { useState, useEffect, useRef } from 'react';
import { Search, FolderGit2, Activity, ShieldCheck, Brain, ArrowRight, Settings } from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext.js';

interface PaletteCommand {
  id: string;
  title: string;
  category: string;
  icon: React.ReactNode;
  action: () => void;
}

export const CommandPalette: React.FC = () => {
  const {
    isCommandPaletteOpen,
    setCommandPaletteOpen,
    setActiveView
  } = useDashboard();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isCommandPaletteOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isCommandPaletteOpen]);

  if (!isCommandPaletteOpen) return null;

  const commands: PaletteCommand[] = [
    {
      id: 'view-overview',
      title: 'Go to Developer Overview',
      category: 'Navigation',
      icon: <ArrowRight size={16} />,
      action: () => {
        setActiveView('overview');
        setCommandPaletteOpen(false);
      }
    },
    {
      id: 'view-projects',
      title: 'View All Registered Projects',
      category: 'Navigation',
      icon: <FolderGit2 size={16} />,
      action: () => {
        setActiveView('projects');
        setCommandPaletteOpen(false);
      }
    },
    {
      id: 'view-timeline',
      title: 'Inspect Activity Timeline',
      category: 'Navigation',
      icon: <Activity size={16} />,
      action: () => {
        setActiveView('timeline');
        setCommandPaletteOpen(false);
      }
    },
    {
      id: 'view-vault',
      title: 'Open Vault & Audit Verifier',
      category: 'Safety & Recovery',
      icon: <ShieldCheck size={16} />,
      action: () => {
        setActiveView('vault');
        setCommandPaletteOpen(false);
      }
    },
    {
      id: 'view-ai',
      title: 'Run AI Codebase Intelligence Analysis',
      category: 'Intelligence',
      icon: <Brain size={16} />,
      action: () => {
        setActiveView('intelligence');
        setCommandPaletteOpen(false);
      }
    },
    {
      id: 'view-settings',
      title: 'Configure Providers & Security Settings',
      category: 'Settings',
      icon: <Settings size={16} />,
      action: () => {
        setActiveView('settings');
        setCommandPaletteOpen(false);
      }
    }
  ];

  const filtered = commands.filter((c) =>
    c.title.toLowerCase().includes(query.toLowerCase()) ||
    c.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
      }
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1100,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '12vh',
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) setCommandPaletteOpen(false);
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '580px',
          backgroundColor: 'var(--deck-bg-surface)',
          border: '1px solid var(--deck-border)',
          borderRadius: 'var(--deck-radius-xl)',
          boxShadow: 'var(--deck-shadow-lg)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Search Input Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '14px 18px',
            borderBottom: '1px solid var(--deck-border)'
          }}
        >
          <Search size={18} color="var(--deck-accent-blue)" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or view name..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            style={{
              flex: 1,
              backgroundColor: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: '15px',
              color: 'var(--deck-text-primary)',
              fontFamily: 'inherit'
            }}
          />
          <span style={{ fontSize: '11px', color: 'var(--deck-text-muted)' }}>ESC to close</span>
        </div>

        {/* Results List */}
        <div style={{ maxHeight: '340px', overflowY: 'auto', padding: '8px' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--deck-text-muted)', fontSize: '13px' }}>
              No commands matching "{query}"
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => item.action()}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: 'var(--deck-radius-md)',
                    backgroundColor: isSelected ? 'var(--deck-accent-blue-subtle)' : 'transparent',
                    color: isSelected ? 'var(--deck-accent-blue-light)' : 'var(--deck-text-primary)',
                    cursor: 'pointer',
                    transition: 'all 0.1s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ color: isSelected ? 'var(--deck-accent-blue-light)' : 'var(--deck-text-muted)' }}>
                      {item.icon}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: isSelected ? 600 : 500 }}>
                      {item.title}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      color: 'var(--deck-text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em'
                    }}
                  >
                    {item.category}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
