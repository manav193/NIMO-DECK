import { describe, it, expect, vi } from 'vitest';
import { GitHubIssueConverter } from '../src/analysis/github-issue-converter.js';
import type { AIRecommendation } from '@nimo-deck/shared';
import type { GitHubClient } from '@nimo-deck/github';

describe('@nimo-deck/intelligence: GitHub Issue Converter', () => {
  const baseRec: AIRecommendation = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    analysisId: '123e4567-e89b-12d3-a456-426614174002',
    projectId: '123e4567-e89b-12d3-a456-426614174000',
    title: 'Migrate to Node 22 LTS',
    category: 'VERIFIED_FACT',
    severity: 'MEDIUM',
    complexity: 'S',
    reasoning: 'Node 18 is approaching EOL',
    evidence: 'package.json: engines.node',
    expectedBenefits: 'Longer LTS support window',
    dependencies: ['node@22.0.0'],
    risks: ['Check native addon compatibility'],
    implementationSteps: ['Update Dockerfile', 'Update package.json engines'],
    acceptanceCriteria: ['All tests pass on Node 22'],
    status: 'ACCEPTED',
    createdAt: new Date()
  };

  it('should require explicit user confirmation to create an issue', async () => {
    const mockClient = { createIssue: vi.fn() } as unknown as GitHubClient;

    await expect(
      GitHubIssueConverter.convertToIssue({
        recommendation: baseRec,
        owner: 'manav193',
        repo: 'NIMO-DECK',
        confirmConversion: false, // Refused confirmation
        githubClient: mockClient
      })
    ).rejects.toThrowError(/Explicit user confirmation required/);

    expect(mockClient.createIssue).not.toHaveBeenCalled();
  });

  it('should reject recommendations that are not in ACCEPTED state', async () => {
    const mockClient = { createIssue: vi.fn() } as unknown as GitHubClient;
    const pendingRec: AIRecommendation = { ...baseRec, status: 'PENDING' };

    await expect(
      GitHubIssueConverter.convertToIssue({
        recommendation: pendingRec,
        owner: 'manav193',
        repo: 'NIMO-DECK',
        confirmConversion: true,
        githubClient: mockClient
      })
    ).rejects.toThrowError(/Only recommendations with status 'ACCEPTED' can be converted/);
  });

  it('should convert accepted recommendation into a structured GitHub issue with labels', async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      id: 99,
      number: 42,
      htmlUrl: 'https://github.com/manav193/NIMO-DECK/issues/42'
    });
    const mockClient = { createIssue: mockCreate } as unknown as GitHubClient;

    const res = await GitHubIssueConverter.convertToIssue({
      recommendation: baseRec,
      owner: 'manav193',
      repo: 'NIMO-DECK',
      confirmConversion: true,
      githubClient: mockClient
    });

    expect(res.issueNumber).toBe(42);
    expect(res.issueUrl).toBe('https://github.com/manav193/NIMO-DECK/issues/42');
    expect(mockCreate).toHaveBeenCalledWith(
      'manav193',
      'NIMO-DECK',
      expect.objectContaining({
        title: '[DECK-AI] Migrate to Node 22 LTS',
        body: expect.stringContaining('### 🛠️ Implementation Steps'),
        labels: expect.arrayContaining(['nimo-deck', 'ai-recommendation', 'verified-fact'])
      })
    );
  });
});
