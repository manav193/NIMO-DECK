import { describe, it, expect } from 'vitest';
import {
  ProjectSchema,
  CreateProjectInputSchema,
  SyncConfigSchema,
  AIRecommendationSchema,
  AuditLogEntrySchema
} from '../src/index.js';

describe('@nimo-deck/shared: Zod Schema Contracts', () => {
  it('should validate valid Project schemas', () => {
    const valid = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'NIMO-DECK',
      localPath: 'C:\\Users\\manav\\OneDrive\\NIMO-DECK',
      gitRemoteUrl: 'https://github.com/manav193/NIMO-DECK',
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const parsed = ProjectSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it('should reject invalid project paths or malformed URLs', () => {
    const invalid = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: '', // Empty name not allowed
      localPath: '',
      gitRemoteUrl: 'not-a-valid-url'
    };

    const parsed = CreateProjectInputSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });

  it('should enforce default values in SyncConfigSchema', () => {
    const parsed = SyncConfigSchema.parse({
      projectId: '123e4567-e89b-12d3-a456-426614174000',
      updatedAt: new Date()
    });

    expect(parsed.autoCommitEnabled).toBe(true);
    expect(parsed.debounceWindowMs).toBe(5000);
    expect(parsed.maxWaitMs).toBe(30000);
    expect(parsed.autoPushMode).toBe('ON_COMMIT');
    expect(parsed.aiCommitMessages).toBe(false);
  });

  it('should validate AIRecommendation with fact-vs-hypothesis separation', () => {
    const recommendation = {
      id: '123e4567-e89b-12d3-a456-426614174001',
      analysisId: '123e4567-e89b-12d3-a456-426614174002',
      projectId: '123e4567-e89b-12d3-a456-426614174000',
      title: 'Upgrade React to v19',
      category: 'VERIFIED_FACT',
      severity: 'MEDIUM',
      complexity: 'M',
      reasoning: 'package.json references outdated version',
      expectedBenefits: 'Concurrent rendering improvements',
      dependencies: ['react@19.0.0', 'react-dom@19.0.0'],
      implementationSteps: ['Run npm install react@19', 'Update components'],
      status: 'PROPOSED',
      createdAt: new Date()
    };

    const parsed = AIRecommendationSchema.safeParse(recommendation);
    expect(parsed.success).toBe(true);
  });

  it('should reject invalid category in AIRecommendation', () => {
    const invalid = {
      id: '123e4567-e89b-12d3-a456-426614174001',
      analysisId: '123e4567-e89b-12d3-a456-426614174002',
      projectId: '123e4567-e89b-12d3-a456-426614174000',
      title: 'Test',
      category: 'GUESS', // Invalid
      severity: 'LOW',
      complexity: 'S',
      reasoning: 'none',
      expectedBenefits: 'none',
      dependencies: [],
      implementationSteps: [],
      createdAt: new Date()
    };

    const parsed = AIRecommendationSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });

  it('should validate AuditLogEntrySchema with SHA-256 hashes', () => {
    const entry = {
      id: '123e4567-e89b-12d3-a456-426614174003',
      projectId: '123e4567-e89b-12d3-a456-426614174000',
      actor: 'SYSTEM',
      action: 'GIT_COMMIT',
      payloadHash: 'a'.repeat(64),
      prevLogHash: 'b'.repeat(64),
      entryHash: 'c'.repeat(64),
      createdAt: new Date()
    };

    const parsed = AuditLogEntrySchema.safeParse(entry);
    expect(parsed.success).toBe(true);
  });
});
