import React, { useEffect, useState } from 'react';
import {
  Cloud,
  FileArchive,
  UploadCloud,
  RefreshCw,
  Download
} from 'lucide-react';
import { Card } from '../common/Card.js';
import { Badge } from '../common/Badge.js';
import { Button } from '../common/Button.js';
import { LoadingSkeleton, ErrorBanner } from '../common/FeedbackStates.js';
import { useDashboard } from '../../context/DashboardContext.js';
import type { DriveStatusInfo } from '../../services/dashboard-service.js';
import type { DriveBackup } from '@nimo-deck/shared';

export const GoogleDriveView: React.FC = () => {
  const { service, selectedProjectId } = useDashboard();
  const [status, setStatus] = useState<DriveStatusInfo | null>(null);
  const [backups, setBackups] = useState<DriveBackup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [st, bk] = await Promise.all([
        service.getDriveStatus(),
        service.listDriveBackups(selectedProjectId || undefined)
      ]);
      setStatus(st);
      setBackups(bk);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedProjectId]);

  const handleSnapshotUpload = async () => {
    try {
      setUploading(true);
      const targetId = selectedProjectId || 'proj-1';
      await service.createDriveSnapshot(targetId);
      if (typeof window !== 'undefined' && window.alert) {
        window.alert('Snapshot successfully archived and verified on Google Drive.');
      }
      await loadData();
    } catch (err) {
      if (typeof window !== 'undefined' && window.alert) {
        window.alert(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <LoadingSkeleton rows={4} height={40} />;
  if (error) return <ErrorBanner message={error} onRetry={loadData} />;
  if (!status) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Account & Storage Bar */}
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
              backgroundColor: 'var(--deck-accent-blue-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--deck-accent-blue)'
            }}
          >
            <Cloud size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px', fontWeight: 600 }}>{status.email || 'Google Drive Connected'}</span>
              <Badge variant={status.connected ? 'green' : 'amber'} size="sm">
                {status.connected ? 'OAuth 2.0 PKCE Active' : 'Disconnected'}
              </Badge>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--deck-text-muted)' }}>
              Total Backups Archived: {status.backupsCount} snapshots
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="secondary" icon={<RefreshCw size={14} />} onClick={loadData}>
            Refresh
          </Button>
          <Button icon={<UploadCloud size={14} />} loading={uploading} onClick={handleSnapshotUpload}>
            Create Snapshot Backup
          </Button>
        </div>
      </div>

      {/* Snapshot Inventory List */}
      <Card title="Google Drive Snapshot Catalog" subtitle="SHA-256 verified ZIP archives stored in project Drive folders">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {backups.map((b) => (
            <div
              key={b.id}
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
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <FileArchive size={20} color="var(--deck-accent-blue-light)" />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 600, fontSize: '14px' }}>
                      {b.backupType} Backup
                    </span>
                    <Badge variant="green" size="sm">
                      {b.status}
                    </Badge>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--deck-text-muted)', fontFamily: 'var(--deck-font-mono)' }}>
                    SHA-256: {b.snapshotSha256.slice(0, 16)}...
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--deck-text-muted)' }}>
                  {(b.sizeBytes / 1024 / 1024).toFixed(2)} MB
                </span>
                <span style={{ fontSize: '11px', color: 'var(--deck-text-muted)' }}>
                  {new Date(b.createdAt).toLocaleDateString()}
                </span>
                <Button size="sm" variant="secondary" icon={<Download size={13} />}>
                  Restore
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
