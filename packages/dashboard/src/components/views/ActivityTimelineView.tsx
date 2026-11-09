import React, { useEffect, useState } from 'react';
import {
  Activity,
  GitCommit,
  Cloud,
  Brain,
  ShieldCheck,
  RefreshCw,
  Search
} from 'lucide-react';
import { Card } from '../common/Card.js';
import { Badge } from '../common/Badge.js';
import { Button } from '../common/Button.js';
import { LoadingSkeleton, ErrorBanner, EmptyState } from '../common/FeedbackStates.js';
import { useDashboard } from '../../context/DashboardContext.js';
import type { TimelineEvent, TimelineEventType } from '@nimo-deck/shared';

export const ActivityTimelineView: React.FC = () => {
  const { service, selectedProjectId } = useDashboard();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');

  const loadTimeline = async () => {
    try {
      setLoading(true);
      setError(null);
      const projId = selectedProjectId || 'proj-1';
      const items = await service.getTimeline(projId, search || undefined);
      setEvents(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTimeline();
  }, [selectedProjectId]);

  const getEventIcon = (type: TimelineEventType) => {
    switch (type) {
      case 'GIT_COMMIT':
        return <GitCommit size={16} color="var(--deck-accent-blue)" />;
      case 'DRIVE_BACKUP':
        return <Cloud size={16} color="var(--deck-success)" />;
      case 'AI_ANALYSIS':
        return <Brain size={16} color="var(--deck-accent-blue-light)" />;
      case 'VAULT_SNAPSHOT':
      case 'VAULT_RESTORE':
        return <ShieldCheck size={16} color="var(--deck-warning)" />;
      default:
        return <Activity size={16} color="var(--deck-text-secondary)" />;
    }
  };

  const filtered = events.filter((e) => {
    if (selectedType !== 'ALL' && e.type !== selectedType) return false;
    if (search) {
      const q = search.toLowerCase();
      return e.title.toLowerCase().includes(q) || e.description.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Filter Controls */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ display: 'flex', gap: '12px', flex: 1, maxWidth: '520px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              backgroundColor: 'var(--deck-bg-surface)',
              border: '1px solid var(--deck-border)',
              borderRadius: 'var(--deck-radius-md)',
              flex: 1
            }}
          >
            <Search size={16} color="var(--deck-text-muted)" />
            <input
              type="text"
              placeholder="Search timeline events..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--deck-text-primary)',
                fontSize: '13px',
                width: '100%',
                fontFamily: 'inherit'
              }}
            />
          </div>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            style={{
              padding: '8px 12px',
              backgroundColor: 'var(--deck-bg-surface)',
              border: '1px solid var(--deck-border)',
              borderRadius: 'var(--deck-radius-md)',
              color: 'var(--deck-text-primary)',
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            <option value="ALL">All Event Types</option>
            <option value="GIT_COMMIT">Git Commits</option>
            <option value="SYNC_CYCLE">Sync Cycles</option>
            <option value="DRIVE_BACKUP">Drive Backups</option>
            <option value="AI_ANALYSIS">AI Analyses</option>
            <option value="VAULT_SNAPSHOT">Vault Snapshots</option>
          </select>
        </div>

        <Button variant="secondary" icon={<RefreshCw size={14} />} onClick={loadTimeline}>
          Refresh Stream
        </Button>
      </div>

      {/* Timeline Stream */}
      <Card title="Chronological Developer Stream" subtitle="Unified event log aggregating local, git, cloud, and intelligence actions">
        {loading ? (
          <LoadingSkeleton rows={5} height={40} />
        ) : error ? (
          <ErrorBanner message={error} onRetry={loadTimeline} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Activity size={36} color="var(--deck-text-muted)" />}
            title="No Matching Events"
            description="Events across commits, cloud backups, and snapshots will appear here in chronological order."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', paddingLeft: '8px' }}>
            {filtered.map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  gap: '16px',
                  alignItems: 'flex-start'
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--deck-bg-surface-elevated)',
                    border: '1px solid var(--deck-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  {getEventIcon(item.type)}
                </div>

                <div
                  style={{
                    flex: 1,
                    backgroundColor: 'var(--deck-bg-navy)',
                    padding: '12px 16px',
                    borderRadius: 'var(--deck-radius-md)',
                    border: '1px solid var(--deck-border)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600 }}>{item.title}</span>
                    <span style={{ fontSize: '11px', color: 'var(--deck-text-muted)' }}>
                      {new Date(item.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--deck-text-secondary)', lineHeight: 1.4 }}>
                    {item.description}
                  </p>
                  <div style={{ marginTop: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <Badge variant="neutral" size="sm">{item.type}</Badge>
                    {item.actor && (
                      <span style={{ fontSize: '11px', color: 'var(--deck-text-muted)' }}>
                        Triggered by: {item.actor}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
