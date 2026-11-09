import { describe, it, expect } from 'vitest';
import { FactHypothesisEngine } from '../src/analysis/fact-hypothesis-engine.js';
import type { AIRecommendation } from '@nimo-deck/shared';
import type { ProjectIngestionContext } from '../src/ingestion/types.js';

describe('@nimo-deck/intelligence: Fact vs Hypothesis Separation Engine', () => {
  const mockContext: ProjectIngestionContext = {
    projectId: '123e4567-e89b-12d3-a456-426614174000',
    projectName: 'DemoProject',
    topology: ['src/index.ts', 'src/auth/jwt.ts', 'package.json'],
    manifests: [
      {
        name: 'demo-project',
        dependencies: { react: '^18.2.0' },
        devDependencies: { vitest: '^3.0.0' },
        scripts: {}
      }
    ],
    documentation: [],
    astSummaries: [
      {
        relativePath: 'src/auth/jwt.ts',
        symbols: [
          {
            name: 'verifyJwtToken',
            kind: 'function',
            exported: true,
            lineStart: 10,
            lineEnd: 25
          }
        ],
        imports: [],
        exports: ['verifyJwtToken'],
        lineCount: 30,
        hasTests: false
      }
    ],
    testStructure: {
      testFileCount: 0,
      testFramework: 'Vitest',
      testFiles: [],
      sourceFilesWithoutTests: ['src/auth/jwt.ts']
    },
    recentCommits: [
      {
        sha: 'abc1234567890abcdef1234567890abcdef12345',
        author: 'developer',
        message: 'fix: auth token validation',
        committedAt: new Date(),
        filesChanged: ['src/auth/jwt.ts']
      }
    ],
    totalFilesScanned: 3,
    contentHash: 'mock-digest'
  };

  it('should preserve VERIFIED_FACT when evidence points to existing source files or AST symbols', () => {
    const groundedRec: AIRecommendation = {
      id: '123e4567-e89b-12d3-a456-426614174001',
      analysisId: '123e4567-e89b-12d3-a456-426614174002',
      projectId: mockContext.projectId,
      title: 'Missing tests for verifyJwtToken',
      category: 'VERIFIED_FACT',
      severity: 'HIGH',
      complexity: 'S',
      reasoning: 'Function verifyJwtToken is exported but has no unit tests',
      evidence: 'src/auth/jwt.ts: verifyJwtToken',
      expectedBenefits: 'Prevents security regression in authentication',
      dependencies: [],
      risks: [],
      implementationSteps: ['Add test in tests/jwt.test.ts'],
      acceptanceCriteria: ['Test passes with 100% branch coverage'],
      status: 'PENDING',
      createdAt: new Date()
    };

    const { grounded, demotedCount } = FactHypothesisEngine.validateAndGround(
      [groundedRec],
      mockContext
    );

    expect(demotedCount).toBe(0);
    expect(grounded[0].category).toBe('VERIFIED_FACT');
  });

  it('should demote VERIFIED_FACT to AI_HYPOTHESIS when evidence is missing or cannot be verified', () => {
    const ungroundedRec: AIRecommendation = {
      id: '123e4567-e89b-12d3-a456-426614174003',
      analysisId: '123e4567-e89b-12d3-a456-426614174002',
      projectId: mockContext.projectId,
      title: 'Upgrade Docker Compose Redis service',
      category: 'VERIFIED_FACT', // Hallucinated fact: no docker-compose or redis exists on disk
      severity: 'LOW',
      complexity: 'M',
      reasoning: 'Redis instance in docker-compose is outdated',
      evidence: 'docker-compose.yml: redis:5.0',
      expectedBenefits: 'Better memory management',
      dependencies: [],
      risks: [],
      implementationSteps: [],
      acceptanceCriteria: [],
      status: 'PENDING',
      createdAt: new Date()
    };

    const { grounded, demotedCount } = FactHypothesisEngine.validateAndGround(
      [ungroundedRec],
      mockContext
    );

    expect(demotedCount).toBe(1);
    expect(grounded[0].category).toBe('AI_HYPOTHESIS');
    expect(grounded[0].reasoning).toContain('[DEMOTED TO AI_HYPOTHESIS');
  });
});
