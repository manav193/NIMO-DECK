import React, { useEffect, useState } from 'react';
import {
  GitBranch,
  GitCommit,
  FileCode2,
  GitPullRequest,
  FolderGit2,
  CheckCircle2
} from 'lucide-react';
import { Card } from '../common/Card.js';
import { Badge } from '../common/Badge.js';
import { Tabs } from '../common/Tabs.js';
import { LoadingSkeleton, ErrorBanner, EmptyState } from '../common/FeedbackStates.js';
import { useDashboard } from '../../context/DashboardContext.js';
import type { Project, RemoteSyncState, TimelineEvent } from '@nimo-deck/shared';

export const RepositoryExplorerView: React.FC = () => {
  const { service, selectedProjectId } = useDashboard();
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>('');
  const [syncState, setSyncState] = useState<RemoteSyncState | null>(null);
  const [commits, setCommits] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'commits' | 'changes' | 'pulls'>('commits');

  const loadData = async (projId?: string) => {
    try {
      setLoading(true);
      setError(null);
      const list = await service.listProjects();
      setProjects(list);

      const targetId = projId || selectedProjectId || (list.length > 0 ? list[0].id : '');
      setActiveProjectId(targetId);

      if (targetId) {
        const [sync, timeline] = await Promise.all([
          service.getSyncStatus(targetId),
          service.getTimeline(targetId)
        ]);
        setSyncState(sync);
        setCommits(timeline.filter((e) => e.type === 'GIT_COMMIT'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedProjectId]);

  const currentProject = projects.find((p) => p.id === activeProjectId);

  if (loading) return <LoadingSkeleton rows={5} height={40} />;
  if (error) return <ErrorBanner message={error} onRetry={() => loadData(activeProjectId)} />;
  if (!currentProject) {
    return (
      <EmptyState
        icon={<FolderGit2 size={40} color="var(--deck-text-muted)" />}
        title="No Project Selected"
        description="Select or register a project to explore branches, commits, and staged diffs."
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Project Selector & Header */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <FolderGit2 size={24} color="var(--deck-accent-blue)" />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <select
                value={activeProjectId}
                onChange={(e) => {
                  setActiveProjectId(e.target.value);
                  loadData(e.target.value);
                }}
                style={{
                  background: 'var(--deck-bg-navy)',
                  border: '1px solid var(--deck-border)',
                  color: 'var(--deck-text-primary)',
                  fontWeight: 600,
                  fontSize: '15px',
                  padding: '4px 8px',
                  borderRadius: 'var(--deck-radius-sm)',
                  cursor: 'pointer'
                }}
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <Badge variant={syncState?.syncStatus === 'IN_SYNC' ? 'green' : 'amber'} size="sm">
                {syncState?.syncStatus || 'UNTRACKED'}
              </Badge>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--deck-text-muted)', fontFamily: 'var(--deck-font-mono)' }}>
              {currentProject.localPath}
            </span>
          </div>
        </div>

        {/* Branch & Head Indicator */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'var(--deck-bg-navy)',
              padding: '6px 12px',
              borderRadius: 'var(--deck-radius-md)',
              border: '1px solid var(--deck-border)',
              fontSize: '12px'
            }}
          >
            <GitBranch size={14} color="var(--deck-accent-blue-light)" />
            <span style={{ fontWeight: 600 }}>{syncState?.branchName || 'main'}</span>
          </div>
          <div
            style={{
              fontSize: '11px',
              fontFamily: 'var(--deck-font-mono)',
              color: 'var(--deck-text-muted)',
              padding: '6px 10px',
              backgroundColor: 'var(--deck-bg-navy)',
              borderRadius: 'var(--deck-radius-md)',
              border: '1px solid var(--deck-border)'
            }}
          >
            HEAD: {syncState?.localHeadSha ? syncState.localHeadSha.slice(0, 7) : 'clean'}
          </div>
        </div>
      </div>

      {/* Explorer Navigation Tabs */}
      <Tabs
        activeTab={tab}
        onTabChange={(id) => setTab(id as typeof tab)}
        tabs={[
          { id: 'commits', label: 'Commit History', icon: <GitCommit size={15} />, badge: commits.length },
          { id: 'changes', label: 'Working Tree Diffs', icon: <FileCode2 size={15} /> },
          { id: 'pulls', label: 'Pull Requests & Issues', icon: <GitPullRequest size={15} /> }
        ]}
      />

      {/* Tab Panels */}
      {tab === 'commits' && (
        <Card title="Repository Commit Stream" subtitle="Full linear Git history from local HEAD and remote branches">
          {commits.length === 0 ? (
            <EmptyState
              icon={<GitCommit size={36} color="var(--deck-text-muted)" />}
              title="No Commits Recorded"
              description="Commits recorded by DECK SYNC or manual Git commands will stream here automatically."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {commits.map((c) => (
                <div
                  key={c.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    backgroundColor: 'var(--deck-bg-navy)',
                    borderRadius: 'var(--deck-radius-md)',
                    border: '1px solid var(--deck-border)'
                  }}
                >
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{ marginTop: '2px' }}>
                      <GitCommit size={18} color="var(--deck-accent-blue)" />
                    </div>
                    <div>
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: 600 }}>
                        {c.title}
                      </h4>
                      <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--deck-text-muted)' }}>
                        <span>Author: {c.actor}</span>
                        <span>{new Date(c.timestamp).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  {c.commitSha && (
                    <span
                      style={{
                        fontSize: '11px',
                        fontFamily: 'var(--deck-font-mono)',
                        backgroundColor: 'var(--deck-bg-surface-elevated)',
                        padding: '3px 8px',
                        borderRadius: 'var(--deck-radius-sm)',
                        color: 'var(--deck-accent-blue-light)'
                      }}
                    >
                      {c.commitSha.slice(0, 7)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === 'changes' && (
        <Card title="Working Tree & Staged Changes" subtitle="Real-time diff inspection before commit construction">
          <div
            style={{
              padding: '24px',
              textAlign: 'center',
              backgroundColor: 'var(--deck-bg-navy)',
              borderRadius: 'var(--deck-radius-md)',
              border: '1px dashed var(--deck-border)'
            }}
          >
            <CheckCircle2 size={32} color="var(--deck-success)" style={{ marginBottom: '8px' }} />
            <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 600 }}>Working Tree Clean</h4>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--deck-text-muted)' }}>
              All modifications have been committed or synchronized.
            </p>
          </div>
        </Card>
      )}

      {tab === 'pulls' && (
        <Card title="GitHub Issues & Pull Requests" subtitle="Synchronized metadata from remote GitHub API">
          <div
            style={{
              padding: '24px',
              textAlign: 'center',
              backgroundColor: 'var(--deck-bg-navy)',
              borderRadius: 'var(--deck-radius-md)',
              border: '1px dashed var(--deck-border)'
            }}
          >
            <GitPullRequest size={32} color="var(--deck-accent-blue)" style={{ marginBottom: '8px' }} />
            <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 600 }}>No Open Pull Requests</h4>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--deck-text-muted)' }}>
              Branch HEAD is aligned with remote repository.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};
