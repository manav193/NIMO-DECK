import React, { useEffect, useState } from 'react';
import { Settings, Cloud, Save, RefreshCw } from 'lucide-react';
import { GithubIcon } from '../common/Icons.js';
import { Card } from '../common/Card.js';
import { Badge } from '../common/Badge.js';
import { Button } from '../common/Button.js';
import { LoadingSkeleton, ErrorBanner } from '../common/FeedbackStates.js';
import { useDashboard } from '../../context/DashboardContext.js';
import type { UserSettings } from '@nimo-deck/shared';
import type { CredentialStatusInfo } from '../../services/dashboard-service.js';

export const SettingsView: React.FC = () => {
  const { service } = useDashboard();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [credentialStatus, setCredentialStatus] = useState<CredentialStatusInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [s, c] = await Promise.all([
        service.getSettings(),
        service.getCredentialStatus()
      ]);
      setSettings(s);
      setCredentialStatus(c);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    try {
      setSaving(true);
      const updated = await service.updateSettings(settings);
      setSettings(updated);
      if (typeof window !== 'undefined' && window.alert) {
        window.alert('Settings successfully updated.');
      }
    } catch (err) {
      if (typeof window !== 'undefined' && window.alert) {
        window.alert(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSkeleton rows={5} height={40} />;
  if (error) return <ErrorBanner message={error} onRetry={loadData} />;
  if (!settings) return null;

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
          <Settings size={24} color="var(--deck-accent-blue)" />
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Settings & Security</h3>
            <span style={{ fontSize: '12px', color: 'var(--deck-text-muted)' }}>
              Credential Storage, Privacy Controls, and Sync Preferences
            </span>
          </div>
        </div>

        <Button variant="secondary" icon={<RefreshCw size={14} />} onClick={loadData}>
          Refresh
        </Button>
      </div>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Credential Store Status */}
        <Card title="OS Credential Vault Status" subtitle="Encrypted secrets managed through native system keychain">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: 'var(--deck-bg-navy)', borderRadius: 'var(--deck-radius-md)', border: '1px solid var(--deck-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <GithubIcon size={18} />
                <span style={{ fontSize: '13px', fontWeight: 500 }}>GitHub Token</span>
              </div>
              <Badge variant={credentialStatus?.githubConfigured ? 'green' : 'amber'} size="sm">
                {credentialStatus?.githubConfigured ? 'Secured' : 'Missing'}
              </Badge>
            </div>

            <div style={{ padding: '12px', backgroundColor: 'var(--deck-bg-navy)', borderRadius: 'var(--deck-radius-md)', border: '1px solid var(--deck-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Cloud size={18} />
                <span style={{ fontSize: '13px', fontWeight: 500 }}>Google Drive OAuth</span>
              </div>
              <Badge variant={credentialStatus?.googleDriveConfigured ? 'green' : 'amber'} size="sm">
                {credentialStatus?.googleDriveConfigured ? 'Secured' : 'Missing'}
              </Badge>
            </div>
          </div>
        </Card>

        {/* AI Provider Config */}
        <Card title="AI Intelligence Provider & Models" subtitle="Configure provider endpoint and privacy boundaries">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Active AI Provider
              </label>
              <select
                value={settings.aiProvider}
                onChange={(e) => setSettings({ ...settings, aiProvider: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  backgroundColor: 'var(--deck-bg-navy)',
                  border: '1px solid var(--deck-border)',
                  borderRadius: 'var(--deck-radius-md)',
                  color: 'var(--deck-text-primary)'
                }}
              >
                <option value="openrouter">OpenRouter (Multi-model)</option>
                <option value="gemini">Google Gemini</option>
                <option value="openai">OpenAI</option>
                <option value="claude">Anthropic Claude</option>
                <option value="ollama">Ollama (Local Offline)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Model Identifier
              </label>
              <input
                type="text"
                value={settings.aiModel}
                onChange={(e) => setSettings({ ...settings, aiModel: e.target.value })}
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
          </div>

          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={settings.localOnlyInference}
                onChange={(e) => setSettings({ ...settings, localOnlyInference: e.target.checked })}
              />
              <span>Enforce local-only offline inference (strictly block external cloud transmissions)</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={settings.autoSyncDefault}
                onChange={(e) => setSettings({ ...settings, autoSyncDefault: e.target.checked })}
              />
              <span>Enable automatic Git commit debounce agent by default on registered repositories</span>
            </label>
          </div>
        </Card>

        {/* Save Bar */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <Button type="submit" loading={saving} icon={<Save size={14} />}>
            Save Preferences
          </Button>
        </div>
      </form>
    </div>
  );
};
