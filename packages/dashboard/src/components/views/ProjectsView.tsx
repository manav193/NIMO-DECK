import React, { useEffect, useState } from 'react';
import {
  FolderGit2,
  Search,
  Plus,
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import { Card } from '../common/Card.js';
import { Badge } from '../common/Badge.js';
import { Button } from '../common/Button.js';
import { Modal } from '../common/Modal.js';
import { LoadingSkeleton, ErrorBanner, EmptyState } from '../common/FeedbackStates.js';
import { useDashboard } from '../../context/DashboardContext.js';
import type { Project } from '@nimo-deck/shared';

export const ProjectsView: React.FC = () => {
  const { service, setSelectedProjectId } = useDashboard();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'mapped' | 'local'>('all');

  // New Project Modal State
  const [isModalOpen, setModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectPath, setNewProjectPath] = useState('');
  const [newGitRemote, setNewGitRemote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const list = await service.listProjects();
      setProjects(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim() || !newProjectPath.trim()) return;

    try {
      setIsSubmitting(true);
      await service.createProject({
        name: newProjectName.trim(),
        localPath: newProjectPath.trim(),
        gitRemoteUrl: newGitRemote.trim() || undefined
      });
      setModalOpen(false);
      setNewProjectName('');
      setNewProjectPath('');
      setNewGitRemote('');
      await loadProjects();
    } catch (err) {
      if (typeof window !== 'undefined' && window.alert) {
        window.alert(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.localPath.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;
    if (filterType === 'mapped') return Boolean(p.gitRemoteUrl);
    if (filterType === 'local') return !p.gitRemoteUrl;
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Controls: Search, Filters, and New Project Button */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ display: 'flex', gap: '12px', flex: 1, maxWidth: '480px' }}>
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
              placeholder="Search repositories by name or path..."
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

          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: '4px', backgroundColor: 'var(--deck-bg-surface)', padding: '4px', borderRadius: 'var(--deck-radius-md)', border: '1px solid var(--deck-border)' }}>
            {(['all', 'mapped', 'local'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 'var(--deck-radius-sm)',
                  border: 'none',
                  backgroundColor: filterType === t ? 'var(--deck-accent-blue)' : 'transparent',
                  color: filterType === t ? '#ffffff' : 'var(--deck-text-secondary)',
                  fontSize: '12px',
                  fontWeight: filterType === t ? 600 : 500,
                  cursor: 'pointer',
                  textTransform: 'capitalize'
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="secondary" icon={<RefreshCw size={14} />} onClick={loadProjects}>
            Refresh
          </Button>
          <Button icon={<Plus size={14} />} onClick={() => setModalOpen(true)}>
            Register Repository
          </Button>
        </div>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <LoadingSkeleton rows={4} height={70} />
      ) : error ? (
        <ErrorBanner message={error} onRetry={loadProjects} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<FolderGit2 size={40} color="var(--deck-text-muted)" />}
          title="No repositories found"
          description={
            search
              ? `No registered repositories matching "${search}".`
              : 'Register local Git workspaces to begin autonomous monitoring and synchronization.'
          }
          action={{
            label: 'Register First Project',
            onClick: () => setModalOpen(true)
          }}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
          {filtered.map((p) => (
            <Card
              key={p.id}
              style={{
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
              onClick={() => setSelectedProjectId(p.id)}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FolderGit2 size={20} color="var(--deck-accent-blue)" />
                    <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--deck-text-primary)' }}>
                      {p.name}
                    </span>
                  </div>
                  <Badge variant={p.gitRemoteUrl ? 'blue' : 'neutral'} size="sm">
                    {p.gitRemoteUrl ? 'GitHub' : 'Local'}
                  </Badge>
                </div>

                <div
                  style={{
                    fontSize: '12px',
                    color: 'var(--deck-text-muted)',
                    fontFamily: 'var(--deck-font-mono)',
                    backgroundColor: 'var(--deck-bg-navy)',
                    padding: '8px 10px',
                    borderRadius: 'var(--deck-radius-sm)',
                    marginBottom: '12px',
                    wordBreak: 'break-all'
                  }}
                >
                  {p.localPath}
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: '12px',
                  borderTop: '1px solid var(--deck-border)'
                }}
              >
                <span style={{ fontSize: '11px', color: 'var(--deck-text-muted)' }}>
                  Registered {new Date(p.createdAt).toLocaleDateString()}
                </span>
                <Button size="sm" variant="secondary" onClick={(e) => {
                  e.stopPropagation();
                  setSelectedProjectId(p.id);
                }}>
                  Workspace <FolderOpen size={13} />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Register Project Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title="Register Local Project">
        <form onSubmit={handleCreateProject} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              Project Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. NIMO-DECK"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                backgroundColor: 'var(--deck-bg-navy)',
                border: '1px solid var(--deck-border)',
                borderRadius: 'var(--deck-radius-md)',
                color: 'var(--deck-text-primary)',
                fontFamily: 'inherit'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              Local Repository Path
            </label>
            <input
              type="text"
              required
              placeholder="e.g. C:\Users\manav\OneDrive\NIMO-DECK"
              value={newProjectPath}
              onChange={(e) => setNewProjectPath(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                backgroundColor: 'var(--deck-bg-navy)',
                border: '1px solid var(--deck-border)',
                borderRadius: 'var(--deck-radius-md)',
                color: 'var(--deck-text-primary)',
                fontFamily: 'var(--deck-font-mono)',
                fontSize: '12px'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              GitHub Remote URL (Optional)
            </label>
            <input
              type="url"
              placeholder="https://github.com/manav193/NIMO-DECK"
              value={newGitRemote}
              onChange={(e) => setNewGitRemote(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                backgroundColor: 'var(--deck-bg-navy)',
                border: '1px solid var(--deck-border)',
                borderRadius: 'var(--deck-radius-md)',
                color: 'var(--deck-text-primary)',
                fontFamily: 'inherit',
                fontSize: '12px'
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Register Project
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
