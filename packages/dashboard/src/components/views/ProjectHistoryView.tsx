import React, { useEffect, useState } from 'react';
import { History, FileText, RefreshCw, BookOpen } from 'lucide-react';
import { Card } from '../common/Card.js';
import { Button } from '../common/Button.js';
import { Tabs } from '../common/Tabs.js';
import { LoadingSkeleton, ErrorBanner } from '../common/FeedbackStates.js';
import { useDashboard } from '../../context/DashboardContext.js';
import type { ProjectMemory, ChangelogRecord } from '@nimo-deck/shared';

export const ProjectHistoryView: React.FC = () => {
  const { service, selectedProjectId } = useDashboard();
  const [memory, setMemory] = useState<ProjectMemory | null>(null);
  const [changelog, setChangelog] = useState<ChangelogRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'memory' | 'changelog'>('memory');

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const targetId = selectedProjectId || 'proj-1';
      const [mem, cl] = await Promise.all([
        service.getProjectMemory(targetId),
        service.generateChangelog({
          projectId: targetId,
          version: 'v1.6.0',
          title: 'NIMO-DECK Release v1.6.0 — Vault & Recovery'
        })
      ]);
      setMemory(mem);
      setChangelog(cl);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedProjectId]);

  if (loading) return <LoadingSkeleton rows={5} height={40} />;
  if (error) return <ErrorBanner message={error} onRetry={loadData} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'var(--deck-bg-surface)',
          padding: '16px 20px',
          borderRadius: 'var(--deck-radius-lg)',
          border: '1px solid var(--deck-border)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <History size={24} color="var(--deck-accent-blue)" />
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Project Evolution & Changelogs</h3>
            <span style={{ fontSize: '12px', color: 'var(--deck-text-muted)' }}>
              Persistent Project Memory & Historical Architectural Decisions
            </span>
          </div>
        </div>

        <Button variant="secondary" icon={<RefreshCw size={14} />} onClick={loadData}>
          Refresh
        </Button>
      </div>

      <Tabs
        activeTab={tab}
        onTabChange={(id) => setTab(id as typeof tab)}
        tabs={[
          { id: 'memory', label: 'Persistent Project Memory', icon: <BookOpen size={15} /> },
          { id: 'changelog', label: 'Generated Release Notes', icon: <FileText size={15} /> }
        ]}
      />

      {tab === 'memory' && memory && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Card title="Project Purpose & Architecture Mission" subtitle="Long-term persistent mission statement">
            <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--deck-text-primary)', lineHeight: 1.6 }}>
              {memory.purpose}
            </p>
            <div
              style={{
                padding: '12px',
                backgroundColor: 'var(--deck-bg-navy)',
                borderRadius: 'var(--deck-radius-md)',
                border: '1px solid var(--deck-border)',
                fontSize: '13px',
                color: 'var(--deck-text-secondary)',
                lineHeight: 1.5
              }}
            >
              {memory.architecture}
            </div>
          </Card>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Card title="Implemented Features">
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', lineHeight: 1.6, color: 'var(--deck-text-secondary)' }}>
                {memory.implementedFeatures.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </Card>

            <Card title="Historical Architectural Decisions">
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', lineHeight: 1.6, color: 'var(--deck-text-secondary)' }}>
                {memory.historicalDecisions.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      )}

      {tab === 'changelog' && changelog && (
        <Card title={changelog.title} subtitle={`Release Range: ${changelog.commitRange}`}>
          <div
            style={{
              padding: '16px',
              backgroundColor: 'var(--deck-bg-navy)',
              borderRadius: 'var(--deck-radius-md)',
              border: '1px solid var(--deck-border)',
              fontFamily: 'var(--deck-font-mono)',
              fontSize: '13px',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              color: 'var(--deck-text-secondary)'
            }}
          >
            {changelog.markdown}
          </div>
        </Card>
      )}
    </div>
  );
};
