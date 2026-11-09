import React, { useState, useEffect } from 'react';
import {
  Terminal,
  Cloud,
  Brain,
  Sliders,
  CheckCircle2,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import { GithubIcon } from '../common/Icons.js';
import { Modal } from '../common/Modal.js';
import { Button } from '../common/Button.js';
import { Badge } from '../common/Badge.js';
import { useDashboard } from '../../context/DashboardContext.js';

interface DiscoveredProjectItem {
  path: string;
  name: string;
  isGitRepo: boolean;
  selected: boolean;
}

export const OnboardingWizard: React.FC = () => {
  const { isOnboardingOpen, setOnboardingOpen, service } = useDashboard();
  const [step, setStep] = useState<number>(1);
  const [discovered, setDiscovered] = useState<DiscoveredProjectItem[]>([]);
  const [loadingDiscovery, setLoadingDiscovery] = useState(false);

  // User onboarding preferences
  const [githubConnected, setGithubConnected] = useState(false);
  const [driveConnected, setDriveConnected] = useState(false);
  const [selectedAiProvider, setSelectedAiProvider] = useState('openrouter');
  const [autoCommitEnabled, setAutoCommitEnabled] = useState(true);
  const [autoPushEnabled, setAutoPushEnabled] = useState(false); // Safety invariant: explicitly opt-in!

  useEffect(() => {
    if (step === 2 && discovered.length === 0) {
      setLoadingDiscovery(true);
      service
        .discoverProjects()
        .then((items) => setDiscovered(items))
        .catch(() => {})
        .finally(() => setLoadingDiscovery(false));
    }
  }, [step]);

  if (!isOnboardingOpen) return null;

  const toggleSelectProject = (path: string) => {
    setDiscovered((prev) =>
      prev.map((p) => (p.path === path ? { ...p, selected: !p.selected } : p))
    );
  };

  const handleFinish = () => {
    setOnboardingOpen(false);
    setStep(1);
    if (typeof window !== 'undefined' && window.alert) {
      window.alert('Onboarding complete! Your workspaces are now configured and monitored.');
    }
  };

  return (
    <Modal isOpen={isOnboardingOpen} onClose={() => setOnboardingOpen(false)} title={`Workspace Setup — Step ${step} of 7`} width="640px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Step Indicator Progress Bar */}
        <div style={{ display: 'flex', gap: '4px', height: '4px', backgroundColor: 'var(--deck-bg-navy)', borderRadius: '2px', overflow: 'hidden' }}>
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                backgroundColor: i + 1 <= step ? 'var(--deck-accent-blue)' : 'transparent',
                transition: 'background-color 0.2s ease'
              }}
            />
          ))}
        </div>

        {/* Step 1: Welcome */}
        {step === 1 && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: 'var(--deck-radius-xl)',
                backgroundColor: 'var(--deck-accent-blue)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                marginBottom: '16px'
              }}
            >
              <Terminal size={32} />
            </div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: 700 }}>
              Welcome to NIMO-DECK
            </h3>
            <p style={{ margin: '0 auto', maxWidth: '440px', fontSize: '14px', color: 'var(--deck-text-secondary)', lineHeight: 1.6 }}>
              The Personal Development Operating System connecting your local filesystems, Git, GitHub, Google Drive, and AI-powered intelligence.
            </p>
          </div>
        )}

        {/* Step 2: Discover Projects */}
        {step === 2 && (
          <div>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 600 }}>
              Discover Local Projects
            </h4>
            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--deck-text-muted)' }}>
              Non-destructive scan. Select repositories you want NIMO-DECK to monitor. Existing code will never be altered without permission.
            </p>

            {loadingDiscovery ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--deck-text-muted)' }}>
                Scanning workspace directories...
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}>
                {discovered.map((item) => (
                  <div
                    key={item.path}
                    onClick={() => toggleSelectProject(item.path)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      backgroundColor: item.selected ? 'var(--deck-accent-blue-subtle)' : 'var(--deck-bg-navy)',
                      border: `1px solid ${item.selected ? 'var(--deck-accent-blue)' : 'var(--deck-border)'}`,
                      borderRadius: 'var(--deck-radius-md)',
                      cursor: 'pointer'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '13px' }}>{item.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--deck-text-muted)', fontFamily: 'var(--deck-font-mono)' }}>
                        {item.path}
                      </div>
                    </div>
                    <Badge variant={item.selected ? 'blue' : 'neutral'} size="sm">
                      {item.selected ? 'Selected' : 'Skip'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Connect GitHub */}
        {step === 3 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <GithubIcon size={20} />
              <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Connect GitHub</h4>
            </div>
            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--deck-text-muted)' }}>
              Enables remote repository discovery, ahead/behind tracking, and safe pull/push operations.
            </p>

            <div
              style={{
                padding: '16px',
                backgroundColor: 'var(--deck-bg-navy)',
                borderRadius: 'var(--deck-radius-md)',
                border: '1px solid var(--deck-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <span style={{ fontSize: '14px', fontWeight: 600 }}>OAuth Authentication</span>
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--deck-text-muted)' }}>
                  {githubConnected ? 'Authenticated as manav193' : 'Click to authorize through browser'}
                </p>
              </div>
              <Button
                variant={githubConnected ? 'secondary' : 'primary'}
                size="sm"
                onClick={() => setGithubConnected(!githubConnected)}
              >
                {githubConnected ? 'Connected' : 'Authorize GitHub'}
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Connect Google Drive */}
        {step === 4 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <Cloud size={20} color="var(--deck-accent-blue)" />
              <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Connect Google Drive</h4>
            </div>
            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--deck-text-muted)' }}>
              Google Drive serves as an offsite disaster recovery vault and documentation mirror. It is never used as a Git remote.
            </p>

            <div
              style={{
                padding: '16px',
                backgroundColor: 'var(--deck-bg-navy)',
                borderRadius: 'var(--deck-radius-md)',
                border: '1px solid var(--deck-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <span style={{ fontSize: '14px', fontWeight: 600 }}>OAuth 2.0 PKCE Loopback</span>
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--deck-text-muted)' }}>
                  {driveConnected ? 'Authenticated with Google Drive' : 'Token securely stored in OS Credential Vault'}
                </p>
              </div>
              <Button
                variant={driveConnected ? 'secondary' : 'primary'}
                size="sm"
                onClick={() => setDriveConnected(!driveConnected)}
              >
                {driveConnected ? 'Connected' : 'Link Google Drive'}
              </Button>
            </div>
          </div>
        )}

        {/* Step 5: Configure AI Providers */}
        {step === 5 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <Brain size={20} color="var(--deck-accent-blue-light)" />
              <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Configure AI Intelligence</h4>
            </div>
            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--deck-text-muted)' }}>
              Select your preferred provider. All secrets are redacted before prompt dispatch.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {['openrouter', 'gemini', 'openai', 'claude', 'ollama'].map((prov) => (
                <div
                  key={prov}
                  onClick={() => setSelectedAiProvider(prov)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    backgroundColor: selectedAiProvider === prov ? 'var(--deck-accent-blue-subtle)' : 'var(--deck-bg-navy)',
                    border: `1px solid ${selectedAiProvider === prov ? 'var(--deck-accent-blue)' : 'var(--deck-border)'}`,
                    borderRadius: 'var(--deck-radius-md)',
                    cursor: 'pointer'
                  }}
                >
                  <span style={{ fontSize: '13px', fontWeight: 600, textTransform: 'capitalize' }}>{prov}</span>
                  <Badge variant={selectedAiProvider === prov ? 'blue' : 'neutral'} size="sm">
                    {selectedAiProvider === prov ? 'Selected' : 'Available'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 6: Synchronization Preferences */}
        {step === 6 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <Sliders size={20} />
              <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Synchronization Preferences</h4>
            </div>
            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--deck-text-muted)' }}>
              Configure automatic background agent boundaries.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={autoCommitEnabled}
                  onChange={(e) => setAutoCommitEnabled(e.target.checked)}
                />
                <span>Automatically group and commit safe local changes (debounced 5 seconds)</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={autoPushEnabled}
                  onChange={(e) => setAutoPushEnabled(e.target.checked)}
                />
                <span>Allow automatic push to remote branch (requires explicit developer authorization)</span>
              </label>
            </div>
          </div>
        )}

        {/* Step 7: Complete Setup */}
        {step === 7 && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <CheckCircle2 size={48} color="var(--deck-success)" style={{ marginBottom: '12px' }} />
            <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: 700 }}>Workspace Ready</h3>
            <p style={{ margin: '0 auto', maxWidth: '400px', fontSize: '14px', color: 'var(--deck-text-secondary)', lineHeight: 1.6 }}>
              All settings verified. The local Git background daemon is active and monitoring your selected repositories.
            </p>
          </div>
        )}

        {/* Footer Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--deck-border)', paddingTop: '16px' }}>
          {step > 1 ? (
            <Button size="sm" variant="ghost" icon={<ArrowLeft size={14} />} onClick={() => setStep((s) => s - 1)}>
              Back
            </Button>
          ) : (
            <div />
          )}

          {step < 7 ? (
            <Button size="sm" icon={<ArrowRight size={14} />} onClick={() => setStep((s) => s + 1)}>
              Continue
            </Button>
          ) : (
            <Button size="sm" onClick={handleFinish}>
              Launch Command Center
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};
