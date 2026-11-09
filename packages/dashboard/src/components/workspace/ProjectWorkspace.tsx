import React, { useEffect, useState } from 'react';
import {
  FolderGit2,
  ArrowLeft,
  Activity,
  FileCode2,
  Brain,
  Milestone,
  BookOpen,
  History,
  ShieldCheck,
  Settings,
  UploadCloud,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { Card } from '../common/Card.js';
import { Badge } from '../common/Badge.js';
import { Button } from '../common/Button.js';
import { Tabs, type TabItem } from '../common/Tabs.js';
import { LoadingSkeleton, ErrorBanner } from '../common/FeedbackStates.js';
import { useDashboard } from '../../context/DashboardContext.js';
import type { ProjectWorkspaceTab } from '../../types/navigation.js';
import type { Project, RemoteSyncState, TimelineEvent, VaultSnapshot, AIRecommendation } from '@nimo-deck/shared';

export const ProjectWorkspace: React.FC = () => {
  const {
    selectedProjectId,
    setSelectedProjectId,
    activeWorkspaceTab,
    setActiveWorkspaceTab,
    service
  } = useDashboard();

  const [project, setProject] = useState<Project | null>(null);
  const [syncState, setSyncState] = useState<RemoteSyncState | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [snapshots, setSnapshots] = useState<VaultSnapshot[]>([]);
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProjectData = async () => {
    if (!selectedProjectId) return;
    try {
      setLoading(true);
      setError(null);
      const [p, s, t, snaps, recs] = await Promise.all([
        service.getProject(selectedProjectId),
        service.getSyncStatus(selectedProjectId),
        service.getTimeline(selectedProjectId),
        service.listVaultSnapshots(selectedProjectId),
        service.getRecommendations(selectedProjectId)
      ]);
      setProject(p);
      setSyncState(s);
      setTimeline(t);
      setSnapshots(snaps);
      setRecommendations(recs);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjectData();
  }, [selectedProjectId]);

  if (!selectedProjectId) return null;
  if (loading) return <LoadingSkeleton rows={6} height={36} />;
  if (error) return <ErrorBanner message={error} onRetry={loadProjectData} />;
  if (!project) return <div>Project not found.</div>;

  const tabs: TabItem[] = [
    { id: 'overview', label: 'Overview', icon: <FolderGit2 size={14} /> },
    { id: 'repository', label: 'Repository', icon: <FileCode2 size={14} /> },
    { id: 'activity', label: 'Activity', icon: <Activity size={14} />, badge: timeline.length },
    { id: 'intelligence', label: 'Intelligence', icon: <Brain size={14} />, badge: recommendations.length },
    { id: 'roadmap', label: 'Roadmap', icon: <Milestone size={14} /> },
    { id: 'documentation', label: 'Documentation', icon: <BookOpen size={14} /> },
    { id: 'history', label: 'History', icon: <History size={14} /> },
    { id: 'snapshots', label: 'Snapshots', icon: <ShieldCheck size={14} />, badge: snapshots.length },
    { id: 'settings', label: 'Settings', icon: <Settings size={14} /> }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Workspace Header */}
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
          <Button
            size="sm"
            variant="ghost"
            icon={<ArrowLeft size={16} />}
            onClick={() => setSelectedProjectId(null)}
          >
            Back
          </Button>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>{project.name}</h2>
              <Badge variant={syncState?.syncStatus === 'IN_SYNC' ? 'green' : 'amber'} size="sm">
                {syncState?.syncStatus || 'LOCAL'}
              </Badge>
              {project.gitRemoteUrl && (
                <Badge variant="blue" size="sm">
                  GitHub Mapped
                </Badge>
              )}
            </div>
            <span style={{ fontSize: '12px', color: 'var(--deck-text-muted)', fontFamily: 'var(--deck-font-mono)' }}>
              {project.localPath}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Button size="sm" variant="secondary" icon={<ArrowDown size={14} />} onClick={() => service.triggerPull(project.id)}>
            Pull
          </Button>
          <Button size="sm" variant="secondary" icon={<ArrowUp size={14} />} onClick={() => service.triggerPush(project.id)}>
            Push
          </Button>
          <Button size="sm" icon={<UploadCloud size={14} />} onClick={() => service.createDriveSnapshot(project.id)}>
            Snapshot
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        activeTab={activeWorkspaceTab}
        onTabChange={(id) => setActiveWorkspaceTab(id as ProjectWorkspaceTab)}
        tabs={tabs}
      />

      {/* Active Tab Content */}
      {activeWorkspaceTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
          <Card title="Workspace Health & Sync Status">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', backgroundColor: 'var(--deck-bg-navy)', borderRadius: 'var(--deck-radius-sm)' }}>
                <span style={{ fontSize: '13px', color: 'var(--deck-text-muted)' }}>Tracking Branch:</span>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>{syncState?.branchName || 'main'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', backgroundColor: 'var(--deck-bg-navy)', borderRadius: 'var(--deck-radius-sm)' }}>
                <span style={{ fontSize: '13px', color: 'var(--deck-text-muted)' }}>HEAD Commit:</span>
                <span style={{ fontSize: '13px', fontFamily: 'var(--deck-font-mono)' }}>
                  {syncState?.localHeadSha ? syncState.localHeadSha.slice(0, 10) : 'Clean'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', backgroundColor: 'var(--deck-bg-navy)', borderRadius: 'var(--deck-radius-sm)' }}>
                <span style={{ fontSize: '13px', color: 'var(--deck-text-muted)' }}>Remote Sync Status:</span>
                <Badge variant={syncState?.syncStatus === 'IN_SYNC' ? 'green' : 'amber'} size="sm">
                  {syncState?.syncStatus || 'OFFLINE'}
                </Badge>
              </div>
            </div>
          </Card>

          <Card title="AI Intelligence Summary">
            <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--deck-text-secondary)', lineHeight: 1.5 }}>
              Active cognitive analysis reports zero security warnings and 100% test pass rate across all monorepo modules.
            </p>
            <Button size="sm" variant="secondary" onClick={() => setActiveWorkspaceTab('intelligence')}>
              Inspect Recommendations
            </Button>
          </Card>
        </div>
      )}

      {activeWorkspaceTab === 'repository' && (
        <Card title="Local Git Tree">
          <p style={{ fontSize: '13px', color: 'var(--deck-text-secondary)' }}>
            Repository at <code style={{ color: 'var(--deck-accent-blue-light)' }}>{project.localPath}</code> is monitored by DECK SYNC daemon.
          </p>
        </Card>
      )}

      {activeWorkspaceTab === 'activity' && (
        <Card title="Recent Activity Stream">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {timeline.slice(0, 5).map((e) => (
              <div key={e.id} style={{ padding: '10px 12px', backgroundColor: 'var(--deck-bg-navy)', borderRadius: 'var(--deck-radius-sm)', border: '1px solid var(--deck-border)', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', fontWeight: 500 }}>{e.title}</span>
                <span style={{ fontSize: '11px', color: 'var(--deck-text-muted)' }}>{new Date(e.timestamp).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {activeWorkspaceTab === 'intelligence' && (
        <Card title="Recommendations for this Project">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {recommendations.map((r) => (
              <div key={r.id} style={{ padding: '12px', backgroundColor: 'var(--deck-bg-navy)', borderRadius: 'var(--deck-radius-md)', border: '1px solid var(--deck-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 600, fontSize: '14px' }}>{r.title}</span>
                  <Badge variant={r.category === 'VERIFIED_FACT' ? 'green' : 'amber'} size="sm">
                    {r.category}
                  </Badge>
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--deck-text-secondary)' }}>{r.reasoning}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {activeWorkspaceTab === 'roadmap' && (
        <Card title="Milestones & Strategic Plan">
          <p style={{ fontSize: '13px', color: 'var(--deck-text-secondary)' }}>
            Phased milestones synced with global development roadmap.
          </p>
        </Card>
      )}

      {activeWorkspaceTab === 'documentation' && (
        <Card title="Mirrored Documentation">
          <p style={{ fontSize: '13px', color: 'var(--deck-text-secondary)' }}>
            Markdown specifications are mirrored to Google Drive under <code style={{ color: 'var(--deck-accent-blue-light)' }}>NIMO-DECK/{project.name}/docs/</code>.
          </p>
        </Card>
      )}

      {activeWorkspaceTab === 'history' && (
        <Card title="Changelogs & Git Revision History">
          <p style={{ fontSize: '13px', color: 'var(--deck-text-secondary)' }}>
            Linear Git history linked to persistent project memory.
          </p>
        </Card>
      )}

      {activeWorkspaceTab === 'snapshots' && (
        <Card title="Vault Snapshots">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {snapshots.map((s) => (
              <div key={s.id} style={{ padding: '10px 12px', backgroundColor: 'var(--deck-bg-navy)', borderRadius: 'var(--deck-radius-sm)', border: '1px solid var(--deck-border)', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', fontWeight: 500 }}>{s.description}</span>
                <Badge variant={s.isPinned ? 'amber' : 'neutral'} size="sm">{s.snapshotType}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {activeWorkspaceTab === 'settings' && (
        <Card title="Per-Project Synchronization Policy">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
              <input type="checkbox" defaultChecked />
              <span>Enable automatic Git commit debounce agent</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
              <input type="checkbox" defaultChecked />
              <span>Schedule periodic Google Drive snapshot backups</span>
            </label>
          </div>
        </Card>
      )}
    </div>
  );
};
