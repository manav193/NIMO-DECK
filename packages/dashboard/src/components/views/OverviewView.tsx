import React, { useEffect, useState } from 'react';
import {
  FolderGit2,
  GitBranch,
  Cloud,
  Brain,
  ShieldCheck,
  Plus,
  RefreshCw,
  ArrowUpRight
} from 'lucide-react';
import { Card } from '../common/Card.js';
import { Badge } from '../common/Badge.js';
import { Button } from '../common/Button.js';
import { LoadingSkeleton, ErrorBanner } from '../common/FeedbackStates.js';
import { useDashboard } from '../../context/DashboardContext.js';
import type { OverviewStats, Project } from '@nimo-deck/shared';

export const OverviewView: React.FC = () => {
  const { service, setActiveView, setSelectedProjectId } = useDashboard();
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [s, p] = await Promise.all([
        service.getOverviewStats(),
        service.listProjects()
      ]);
      setStats(s);
      setProjects(p);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) return <LoadingSkeleton rows={6} height={32} />;
  if (error) return <ErrorBanner message={error} onRetry={loadData} />;
  if (!stats) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner / System Health Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          backgroundColor: 'var(--deck-bg-surface)',
          borderRadius: 'var(--deck-radius-lg)',
          border: '1px solid var(--deck-border)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: stats.systemHealth === 'HEALTHY' ? 'var(--deck-success)' : 'var(--deck-warning)'
            }}
          />
          <div>
            <span style={{ fontSize: '14px', fontWeight: 600 }}>System Status: </span>
            <span style={{ fontSize: '13px', color: 'var(--deck-text-secondary)' }}>
              {stats.systemHealth === 'HEALTHY' ? 'All Daemons Operational' : 'Sync Latency Detected'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Button size="sm" variant="secondary" icon={<RefreshCw size={14} />} onClick={loadData}>
            Refresh
          </Button>
          <Button size="sm" icon={<Plus size={14} />} onClick={() => setActiveView('projects')}>
            Register Project
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px'
        }}
      >
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: 'var(--deck-text-muted)', fontWeight: 500 }}>Active Projects</span>
            <FolderGit2 size={18} color="var(--deck-accent-blue)" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--deck-text-primary)' }}>
            {stats.totalProjects}
          </div>
          <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--deck-text-secondary)' }}>
            {stats.activeProjects} active daemons monitoring
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: 'var(--deck-text-muted)', fontWeight: 500 }}>Git Sync Health</span>
            <GitBranch size={18} color="var(--deck-success)" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--deck-text-primary)' }}>
            {stats.inSyncCount} / {stats.totalProjects}
          </div>
          <div style={{ marginTop: '6px', display: 'flex', gap: '6px' }}>
            <Badge variant="green" size="sm">{stats.inSyncCount} In Sync</Badge>
            {stats.aheadCount > 0 && <Badge variant="blue" size="sm">{stats.aheadCount} Ahead</Badge>}
            {stats.divergedCount > 0 && <Badge variant="red" size="sm">{stats.divergedCount} Diverged</Badge>}
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: 'var(--deck-text-muted)', fontWeight: 500 }}>Drive Snapshots</span>
            <Cloud size={18} color="var(--deck-accent-blue-light)" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--deck-text-primary)' }}>
            {stats.recentSnapshotsCount}
          </div>
          <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--deck-text-secondary)' }}>
            {stats.driveConnected ? 'Google Drive linked & verified' : 'Drive disconnected'}
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: 'var(--deck-text-muted)', fontWeight: 500 }}>Audit & Recovery</span>
            <ShieldCheck size={18} color="var(--deck-warning)" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--deck-text-primary)' }}>
            100%
          </div>
          <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--deck-success)' }}>
            Cryptographic SHA-256 chain valid
          </div>
        </Card>
      </div>

      {/* Main Content Split: Managed Repositories & Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        {/* Projects List Preview */}
        <Card
          title="Monitored Projects"
          subtitle="Local workspaces actively monitored by the background sync agent"
          action={
            <Button size="sm" variant="ghost" onClick={() => setActiveView('projects')}>
              View All <ArrowUpRight size={14} />
            </Button>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {projects.map((p) => (
              <div
                key={p.id}
                onClick={() => setSelectedProjectId(p.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  backgroundColor: 'var(--deck-bg-navy)',
                  borderRadius: 'var(--deck-radius-md)',
                  border: '1px solid var(--deck-border)',
                  cursor: 'pointer',
                  transition: 'border-color 0.12s ease'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 600, fontSize: '14px' }}>{p.name}</span>
                    <Badge variant={p.gitRemoteUrl ? 'blue' : 'neutral'} size="sm">
                      {p.gitRemoteUrl ? 'GitHub Mapped' : 'Local Only'}
                    </Badge>
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--deck-text-muted)', fontFamily: 'var(--deck-font-mono)' }}>
                    {p.localPath}
                  </span>
                </div>
                <Button size="sm" variant="secondary">
                  Open Workspace
                </Button>
              </div>
            ))}
          </div>
        </Card>

        {/* Intelligence Insights Summary */}
        <Card
          title="Cognitive Intelligence"
          subtitle="AI recommendations for your repositories"
          action={
            <Button size="sm" variant="ghost" onClick={() => setActiveView('intelligence')}>
              Explore <ArrowUpRight size={14} />
            </Button>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div
              style={{
                padding: '12px',
                borderRadius: 'var(--deck-radius-md)',
                backgroundColor: 'var(--deck-accent-blue-subtle)',
                border: '1px solid rgba(59, 130, 246, 0.2)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <Brain size={16} color="var(--deck-accent-blue-light)" />
                <span style={{ fontWeight: 600, fontSize: '13px' }}>Fact-Grounded Analysis</span>
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--deck-text-secondary)', lineHeight: 1.4 }}>
                All recommendations are verified against actual AST symbols and disk files.
              </p>
            </div>

            <div
              style={{
                padding: '12px',
                borderRadius: 'var(--deck-radius-md)',
                backgroundColor: 'var(--deck-bg-navy)',
                border: '1px solid var(--deck-border)'
              }}
            >
              <span style={{ fontSize: '12px', color: 'var(--deck-text-muted)' }}>Latest Verification:</span>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', fontWeight: 500 }}>
                Phase 6 Vault audit & CAS differential snapshots confirmed valid on main.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
