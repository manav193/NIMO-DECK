import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  Lock,
  Layers,
  CheckCircle2
} from 'lucide-react';
import { Card } from '../common/Card.js';
import { Badge } from '../common/Badge.js';
import { Button } from '../common/Button.js';
import { Tabs } from '../common/Tabs.js';
import { LoadingSkeleton, ErrorBanner } from '../common/FeedbackStates.js';
import { useDashboard } from '../../context/DashboardContext.js';
import type { VaultSnapshot, RestorePreview } from '@nimo-deck/shared';

export const VaultView: React.FC = () => {
  const { service, selectedProjectId } = useDashboard();
  const [snapshots, setSnapshots] = useState<VaultSnapshot[]>([]);
  const [auditReport, setAuditReport] = useState<{ isValid: boolean; totalVerified: number; tamperEvidentGuarantee: string } | null>(null);
  const [preview, setPreview] = useState<RestorePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'snapshots' | 'audit' | 'restore'>('snapshots');

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const targetId = selectedProjectId || 'proj-1';
      const [snaps, audit, prev] = await Promise.all([
        service.listVaultSnapshots(targetId),
        service.verifyAuditChain(targetId),
        service.getRestorePreview('snap-1', 'C:\\Users\\manav\\OneDrive\\NIMO-DECK')
      ]);
      setSnapshots(snaps);
      setAuditReport(audit);
      setPreview(prev);
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
          border: '1px solid var(--deck-border)',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <ShieldCheck size={24} color="var(--deck-warning)" />
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>DECK VAULT & Disaster Recovery</h3>
            <span style={{ fontSize: '12px', color: 'var(--deck-text-muted)' }}>
              Content-Addressed Snapshots (CAS) & Cryptographic Audit Verification
            </span>
          </div>
        </div>

        <Button variant="secondary" icon={<RefreshCw size={14} />} onClick={loadData}>
          Verify Chain & Refresh
        </Button>
      </div>

      <Tabs
        activeTab={tab}
        onTabChange={(id) => setTab(id as typeof tab)}
        tabs={[
          { id: 'snapshots', label: 'Differential Snapshots', icon: <Layers size={15} />, badge: snapshots.length },
          { id: 'audit', label: 'Cryptographic Audit Verification', icon: <Lock size={15} /> },
          { id: 'restore', label: 'Disaster Recovery Preview', icon: <RotateCcw size={15} /> }
        ]}
      />

      {/* Snapshots Tab */}
      {tab === 'snapshots' && (
        <Card title="Snapshot Inventory" subtitle="Non-destructive content-addressed snapshots with deduplicated CAS blobs">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {snapshots.map((s) => (
              <div
                key={s.id}
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
                    <span style={{ fontWeight: 600, fontSize: '14px' }}>{s.description}</span>
                    <Badge variant={s.isPinned ? 'amber' : 'neutral'} size="sm">
                      {s.isPinned ? 'Pinned Golden Point' : s.snapshotType}
                    </Badge>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '4px', fontSize: '11px', color: 'var(--deck-text-muted)', fontFamily: 'var(--deck-font-mono)' }}>
                    <span>Root Hash: {s.rootHash ? s.rootHash.slice(0, 16) : 'genesis'}...</span>
                    <span>Files: {s.fileCount}</span>
                    <span>Size: {(s.sizeBytes / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <Button size="sm" variant="secondary" onClick={() => setTab('restore')}>
                    Preview Restore
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Audit Verification Tab */}
      {tab === 'audit' && auditReport && (
        <Card title="Audit Chain Verification Report" subtitle="Full cryptographic check from genesis hash to head">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px',
                backgroundColor: auditReport.isValid ? 'var(--deck-success-subtle)' : 'var(--deck-danger-subtle)',
                borderRadius: 'var(--deck-radius-md)',
                border: `1px solid ${auditReport.isValid ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`
              }}
            >
              <CheckCircle2 size={24} color={auditReport.isValid ? 'var(--deck-success)' : 'var(--deck-danger)'} />
              <div>
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: auditReport.isValid ? 'var(--deck-success)' : 'var(--deck-danger)' }}>
                  {auditReport.isValid ? 'Audit Chain Cryptographically Valid' : 'Tamper Detected in Chain'}
                </h4>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--deck-text-secondary)' }}>
                  Successfully verified {auditReport.totalVerified} chained records linking to genesis hash.
                </p>
              </div>
            </div>

            <div
              style={{
                padding: '14px',
                backgroundColor: 'var(--deck-bg-navy)',
                borderRadius: 'var(--deck-radius-md)',
                border: '1px solid var(--deck-border)',
                fontSize: '13px',
                color: 'var(--deck-text-secondary)',
                lineHeight: 1.5
              }}
            >
              <strong style={{ color: 'var(--deck-text-primary)' }}>Tamper-Evident Security Model: </strong>
              {auditReport.tamperEvidentGuarantee}
            </div>
          </div>
        </Card>
      )}

      {/* Restore Tab */}
      {tab === 'restore' && preview && (
        <Card title="Safe Restore Dry-Run Preview" subtitle="Inspect exact proposed file mutations prior to executing disk writes">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: 'var(--deck-warning-subtle)',
                borderRadius: 'var(--deck-radius-md)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              <AlertTriangle size={18} color="var(--deck-warning)" />
              <span style={{ fontSize: '13px', color: 'var(--deck-text-secondary)' }}>
                <strong>Zero-Data-Loss Safety Gate: </strong>
                Restoration requires explicit confirmation and automatically captures a pre-restore safety snapshot with rollback on failure.
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <div style={{ padding: '12px', backgroundColor: 'var(--deck-bg-navy)', borderRadius: 'var(--deck-radius-md)', border: '1px solid var(--deck-border)' }}>
                <span style={{ fontSize: '12px', color: 'var(--deck-text-muted)' }}>Files to Overwrite</span>
                <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--deck-warning)', marginTop: '4px' }}>
                  {preview.filesToOverwrite.length}
                </div>
              </div>

              <div style={{ padding: '12px', backgroundColor: 'var(--deck-bg-navy)', borderRadius: 'var(--deck-radius-md)', border: '1px solid var(--deck-border)' }}>
                <span style={{ fontSize: '12px', color: 'var(--deck-text-muted)' }}>Files to Create</span>
                <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--deck-success)', marginTop: '4px' }}>
                  {preview.filesToCreate.length}
                </div>
              </div>

              <div style={{ padding: '12px', backgroundColor: 'var(--deck-bg-navy)', borderRadius: 'var(--deck-radius-md)', border: '1px solid var(--deck-border)' }}>
                <span style={{ fontSize: '12px', color: 'var(--deck-text-muted)' }}>Unchanged Files</span>
                <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--deck-text-secondary)', marginTop: '4px' }}>
                  {preview.filesUnchanged.length}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <Button variant="secondary" onClick={() => setTab('snapshots')}>
                Cancel
              </Button>
              <Button
                variant="danger"
                icon={<RotateCcw size={14} />}
                onClick={() => {
                  if (typeof window !== 'undefined' && window.alert) {
                    window.alert('Restoration requires confirmRestore: true via Desktop IPC command.');
                  }
                }}
              >
                Execute Safe Restore
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
