import { describe, it, expect } from 'vitest';
import { CrossProjectAnalyzer } from '../src/cross-project/cross-project-analyzer.js';
import type { ProjectIngestionContext } from '../src/ingestion/types.js';

describe('@nimo-deck/intelligence: Cross-Project Intelligence', () => {
  const projectA: ProjectIngestionContext = {
    projectId: '11111111-1111-1111-1111-111111111111',
    projectName: 'Project-A',
    topology: ['package.json', 'src/crypto.ts'],
    manifests: [
      {
        name: 'project-a',
        dependencies: { zod: '^3.24.0', drizzle: '^0.39.0' },
        devDependencies: { vitest: '^3.0.0' },
        scripts: {}
      }
    ],
    documentation: [],
    astSummaries: [
      {
        relativePath: 'src/crypto.ts',
        symbols: [
          {
            name: 'calculateShannonEntropy',
            kind: 'function',
            exported: true,
            lineStart: 5,
            lineEnd: 20
          }
        ],
        imports: [],
        exports: ['calculateShannonEntropy'],
        lineCount: 25,
        hasTests: true
      }
    ],
    testStructure: {
      testFileCount: 2,
      testFramework: 'Vitest',
      testFiles: ['tests/a.test.ts'],
      sourceFilesWithoutTests: []
    },
    recentCommits: [],
    totalFilesScanned: 2,
    contentHash: 'hash-a'
  };

  const projectB: ProjectIngestionContext = {
    projectId: '22222222-2222-2222-2222-222222222222',
    projectName: 'Project-B',
    topology: ['package.json', 'src/entropy-helper.ts'],
    manifests: [
      {
        name: 'project-b',
        dependencies: { zod: '^3.24.0', express: '^4.19.0' },
        devDependencies: { vitest: '^3.0.0' },
        scripts: {}
      }
    ],
    documentation: [],
    astSummaries: [
      {
        relativePath: 'src/entropy-helper.ts',
        symbols: [
          {
            name: 'calculateShannonEntropy',
            kind: 'function',
            exported: true,
            lineStart: 1,
            lineEnd: 15
          }
        ],
        imports: [],
        exports: ['calculateShannonEntropy'],
        lineCount: 20,
        hasTests: true
      }
    ],
    testStructure: {
      testFileCount: 3,
      testFramework: 'Vitest',
      testFiles: ['tests/b.test.ts'],
      sourceFilesWithoutTests: []
    },
    recentCommits: [],
    totalFilesScanned: 2,
    contentHash: 'hash-b'
  };

  it('should detect shared dependencies across projects', () => {
    const insights = CrossProjectAnalyzer.analyze([projectA, projectB]);
    const depOverlap = insights.find((i) => i.type === 'DEPENDENCY_OVERLAP');
    expect(depOverlap).toBeDefined();
    expect(depOverlap?.description).toContain('zod');
    expect(depOverlap?.licensingNotes).toContain('permissive licenses');
  });

  it('should detect duplicated symbols and recommend reusable shared modules', () => {
    const insights = CrossProjectAnalyzer.analyze([projectA, projectB]);
    const reusable = insights.find((i) => i.type === 'REUSABLE_MODULE');
    expect(reusable).toBeDefined();
    expect(reusable?.description).toContain('calculateShannonEntropy');
    expect(reusable?.recommendation).toContain('shared package');
  });

  it('should detect architectural similarities (e.g. shared test frameworks)', () => {
    const insights = CrossProjectAnalyzer.analyze([projectA, projectB]);
    const arch = insights.find((i) => i.type === 'ARCHITECTURE_SIMILARITY');
    expect(arch).toBeDefined();
    expect(arch?.title).toContain('Vitest');
  });
});
