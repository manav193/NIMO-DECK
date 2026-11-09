import React, { useEffect, useState } from 'react';
import {
  ArrowUp,
  ArrowDown,
  ShieldCheck
} from 'lucide-react';
import { GithubIcon } from '../common/Icons.js';
import { Card } from '../common/Card.js';
import { Badge } from '../common/Badge.js';
import { Button } from '../common/Button.js';
import { LoadingSkeleton, ErrorBanner } from '../common/FeedbackStates.js';
import { useDashboard } from '../../context/DashboardContext.js';
import type { GitHubStatusInfo } from '../../services/dashboard-service.js';

export const GitHubSyncView: React.FC = () => {
  const { service, selectedProjectId } = useDashboard();
  const [status, setStatus] = useState<GitHubStatusInfo | null>(null);
  const [repos, setRepos] = useState<Array<{ name: string; owner: string; isPrivate: boolean; mappedProjectId: string | null }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [st, rp] = await Promise.all([
        service.getGitHubStatus(),
        service.listGitHubRepos()
      ]);
      setStatus(st);
      setRepos(rp);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePush = async () => {
    try {
      setSyncing(true);
      await service.triggerPush(selectedProjectId || 'proj-1');
      if (typeof window !== 'undefined' && window.alert) {
        window.alert('Pushed safe commits to remote branch successfully.');
      }
      await loadData();
    } catch (err) {
      if (typeof window !== 'undefined' && window.alert) {
        window.alert(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setSyncing(false);
    }
  };

  const handlePull = async () => {
    try {
      setSyncing(true);
      await service.triggerPull(selectedProjectId || 'proj-1');
      if (typeof window !== 'undefined' && window.alert) {
        window.alert('Fast-forward pull completed without merge conflicts.');
      }
      await loadData();
    } catch (err) {
      if (typeof window !== 'undefined' && window.alert) {
        window.alert(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setSyncing(false);
    }
  };

  if (loading) return <LoadingSkeleton rows={4} height={40} />;
  if (error) return <ErrorBanner message={error} onRetry={loadData} />;
  if (!status) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* GitHub Account Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'var(--deck-bg-surface)',
          padding: '16px 20px',
          borderRadius: 'var(--deck-radius-lg)',
          border: '1px solid var(--deck-border)',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--deck-radius-md)',
              backgroundColor: '#24292e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff'
            }}
          >
            <GithubIcon size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px', fontWeight: 600 }}>{status.username || 'Not Connected'}</span>
              <Badge variant={status.connected ? 'green' : 'amber'} size="sm">
                {status.connected ? 'OAuth Connected' : 'Disconnected'}
              </Badge>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--deck-text-muted)' }}>
              Rate Limits Remaining: {status.rateLimitRemaining ?? 5000} / {status.rateLimitTotal ?? 5000} calls
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="secondary" icon={<ArrowDown size={14} />} loading={syncing} onClick={handlePull}>
            Fast-Forward Pull
          </Button>
          <Button icon={<ArrowUp size={14} />} loading={syncing} onClick={handlePush}>
            Push Safe Commits
          </Button>
        </div>
      </div>

      {/* Safety Invariant Notice */}
      <div
        style={{
          padding: '12px 16px',
          backgroundColor: 'var(--deck-accent-blue-subtle)',
          borderRadius: 'var(--deck-radius-md)',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}
      >
        <ShieldCheck size={18} color="var(--deck-accent-blue-light)" />
        <span style={{ fontSize: '13px', color: 'var(--deck-text-secondary)' }}>
          <strong style={{ color: 'var(--deck-accent-blue-light)' }}>DECK SYNC Safety Invariant: </strong>
          Force-pushing is strictly prohibited. Pushes are gated by pre-commit secret scanners and remote fast-forward verification.
        </span>
      </div>

      {/* Repository Mapping Table */}
      <Card title="Remote Repository Mapping" subtitle="Local workspaces correlated with authenticated GitHub repositories">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {repos.map((r, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                backgroundColor: 'var(--deck-bg-navy)',
                borderRadius: 'var(--deck-radius-md)',
                border: '1px solid var(--deck-border)'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: 600, fontSize: '14px' }}>
                    {r.owner}/{r.name}
                  </span>
                  <Badge variant={r.isPrivate ? 'neutral' : 'blue'} size="sm">
                    {r.isPrivate ? 'Private' : 'Public'}
                  </Badge>
                </div>
                <span style={{ fontSize: '12px', color: 'var(--deck-text-muted)' }}>
                  {r.mappedProjectId ? `Mapped to project ID: ${r.mappedProjectId}` : 'Unmapped remote repository'}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Badge variant={r.mappedProjectId ? 'green' : 'amber'} size="sm">
                  {r.mappedProjectId ? 'Mapped' : 'Unmapped'}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
