import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  createDatabaseConnection,
  runMigrations,
  ProjectRepository,
  DeckEventBus
} from '@nimo-deck/core';
import { DeckIntelligenceEngine } from '../src/engine/deck-intelligence-engine.js';
import { ProviderRegistry } from '../src/providers/provider-registry.js';
import { OpenRouterAdapter } from '../src/providers/openrouter-adapter.js';

describe('@nimo-deck/intelligence: DeckIntelligenceEngine End-to-End', () => {
  let tempDir: string;
  let dbConn: ReturnType<typeof createDatabaseConnection>;
  let projectRepo: ProjectRepository;
  let eventBus: DeckEventBus;
  let testProjectId: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nimo-intel-test-'));
    dbConn = createDatabaseConnection({ inMemory: true });
    runMigrations(dbConn.sqlite);

    projectRepo = new ProjectRepository(dbConn.db);
    eventBus = new DeckEventBus();

    // Create a real mock project on disk
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify(
        {
          name: 'sample-project',
          version: '1.0.0',
          dependencies: { express: '^4.19.0' },
          devDependencies: { vitest: '^3.0.0' }
        },
        null,
        2
      )
    );

    fs.writeFileSync(
      path.join(tempDir, 'README.md'),
      '# Sample Project\nHigh performance REST API service.'
    );

    fs.writeFileSync(
      path.join(tempDir, 'src', 'server.ts'),
      `
import express from 'express';

export class ApiServer {
  start(port: number): void {
    if (port > 0) {
      console.log('Listening on port ' + port);
    }
  }
}
`
    );

    const project = projectRepo.create({
      name: 'Sample Project',
      localPath: tempDir
    });
    testProjectId = project.id;
  });

  afterEach(() => {
    dbConn.sqlite.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should analyze project, persist analysis and recommendations, and update project memory', async () => {
    const mockStructuredOutput = {
      summaryMarkdown: '### Architecture Overview\nExpress-based modular API service with TypeScript.',
      techDebtReport: '- Missing integration tests for ApiServer.\n- Express 4.x should consider Express 5.x.',
      securityReport: '- No helmet or rate-limiting middleware configured.',
      recommendations: [
        {
          title: 'Implement ApiServer test suite',
          category: 'VERIFIED_FACT',
          severity: 'HIGH',
          complexity: 'S',
          reasoning: 'ApiServer in src/server.ts has no corresponding test file.',
          evidence: 'src/server.ts: ApiServer',
          expectedBenefits: 'Improves server stability and test coverage',
          dependencies: ['vitest'],
          risks: ['None'],
          implementationSteps: ['Create src/server.test.ts', 'Test start() method'],
          acceptanceCriteria: ['Test executes cleanly']
        },
        {
          title: 'Add helmet security headers',
          category: 'AI_HYPOTHESIS',
          severity: 'MEDIUM',
          complexity: 'XS',
          reasoning: 'Express services benefit from automated header protection',
          evidence: 'package.json: express',
          expectedBenefits: 'Hardens HTTP response headers',
          dependencies: ['helmet'],
          risks: ['Verify CSP configuration'],
          implementationSteps: ['npm install helmet', 'app.use(helmet())'],
          acceptanceCriteria: ['Headers present in curl test']
        }
      ],
      roadmapMilestones: [
        {
          phase: 1,
          name: 'Foundation & Testing',
          items: [
            {
              id: 'rec_01',
              title: 'Implement ApiServer test suite',
              complexity: 'S',
              category: 'VERIFIED_FACT',
              dependencies: []
            }
          ]
        }
      ]
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify(mockStructuredOutput) } }],
        usage: { prompt_tokens: 350, completion_tokens: 120, total_tokens: 470 }
      })
    });

    const openrouter = new OpenRouterAdapter({
      apiKey: 'test-key',
      fetchFn: mockFetch as any
    });

    const registry = new ProviderRegistry({ primaryProviderId: 'openrouter' });
    registry.registerProvider(openrouter);

    const engine = new DeckIntelligenceEngine({
      db: dbConn.db,
      registry,
      eventBus
    });

    const eventSpy = vi.fn();
    eventBus.on('ai:analysis_completed', eventSpy);

    // 1. First run: full analysis
    const result = await engine.analyzeProject({
      projectId: testProjectId,
      projectName: 'Sample Project',
      projectPath: tempDir,
      commitSha: 'commit-sha-1234'
    });

    expect(result.skippedAsUnchanged).toBeUndefined();
    expect(result.analysis.recommendations.length).toBe(2);
    expect(result.roadmap.milestones.length).toBe(1);
    expect(eventSpy).toHaveBeenCalled();

    // Verify database record
    const storedAnalysis = engine.getAnalysisRepo().getLatestAnalysis(testProjectId);
    expect(storedAnalysis).toBeDefined();
    expect(storedAnalysis?.summaryMarkdown).toContain('Express-based modular API service');
    expect(storedAnalysis?.recommendations.length).toBe(2);

    // Verify Project Memory
    const memory = engine.getProjectMemory(testProjectId);
    expect(memory).toBeDefined();
    expect(memory?.purpose).toContain('High performance REST API service');
    expect(memory?.implementedFeatures).toContain('ApiServer');

    // 2. Second run without file changes: incremental detection skips re-running AI
    const secondResult = await engine.analyzeProject({
      projectId: testProjectId,
      projectName: 'Sample Project',
      projectPath: tempDir
    });

    expect(secondResult.skippedAsUnchanged).toBe(true);
    // Provider was not called a second time
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
