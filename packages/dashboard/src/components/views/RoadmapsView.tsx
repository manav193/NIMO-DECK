import React, { useEffect, useState } from 'react';
import { Milestone, CheckCircle2, RefreshCw } from 'lucide-react';
import { Card } from '../common/Card.js';
import { Badge } from '../common/Badge.js';
import { Button } from '../common/Button.js';
import { LoadingSkeleton, ErrorBanner, EmptyState } from '../common/FeedbackStates.js';
import { useDashboard } from '../../context/DashboardContext.js';
import type { AIRoadmap } from '@nimo-deck/shared';

export const RoadmapsView: React.FC = () => {
  const { service, selectedProjectId } = useDashboard();
  const [roadmap, setRoadmap] = useState<AIRoadmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRoadmap = async () => {
    try {
      setLoading(true);
      setError(null);
      const targetId = selectedProjectId || 'proj-1';
      const data = await service.getRoadmap(targetId);
      setRoadmap(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoadmap();
  }, [selectedProjectId]);

  if (loading) return <LoadingSkeleton rows={4} height={40} />;
  if (error) return <ErrorBanner message={error} onRetry={loadRoadmap} />;

  if (!roadmap) {
    return (
      <EmptyState
        icon={<Milestone size={36} color="var(--deck-text-muted)" />}
        title="No Roadmap Generated"
        description="Run AI codebase intelligence to synthesize a phased development roadmap."
      />
    );
  }

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
          <Milestone size={24} color="var(--deck-accent-blue)" />
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>{roadmap.title}</h3>
            <span style={{ fontSize: '12px', color: 'var(--deck-text-muted)' }}>
              Interactive Development Milestones & Strategic Planning
            </span>
          </div>
        </div>

        <Button variant="secondary" icon={<RefreshCw size={14} />} onClick={loadRoadmap}>
          Refresh
        </Button>
      </div>

      {/* Phased Milestones */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {roadmap.milestones.map((m) => (
          <Card
            key={m.phase}
            title={`Phase ${m.phase}: ${m.name}`}
            subtitle={`Milestone Items: ${m.items.length}`}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {m.items.map((item) => (
                <div
                  key={item.id}
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <CheckCircle2
                      size={18}
                      color="var(--deck-success)"
                    />
                    <div>
                      <h4 style={{ margin: '0 0 2px 0', fontSize: '14px', fontWeight: 600 }}>{item.title}</h4>
                      <p style={{ margin: 0, fontSize: '12px', color: 'var(--deck-text-muted)' }}>
                        Category: {item.category} • Dependencies: {item.dependencies.length > 0 ? item.dependencies.join(', ') : 'None'}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <Badge variant="blue" size="sm">
                      Effort: {item.complexity}
                    </Badge>
                    <Badge variant={item.category === 'VERIFIED_FACT' ? 'green' : 'amber'} size="sm">
                      {item.category === 'VERIFIED_FACT' ? 'Verified' : 'Hypothesis'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
