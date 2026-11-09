import { describe, it, expect } from 'vitest';
import {
  ConventionalCommitBuilder,
  CommitMessageService,
  type AICommitMessageGenerator
} from '../src/index.js';

describe('@nimo-deck/sync: Commit Message Generator', () => {
  const builder = new ConventionalCommitBuilder();

  it('should infer "docs" type for documentation updates', () => {
    const msg = builder.inferMessage(['docs/ARCHITECTURE.md', 'README.md']);
    expect(msg.type).toBe('docs');
    expect(msg.title).toContain('docs: update project documentation');
  });

  it('should infer "test" type for test file changes', () => {
    const msg = builder.inferMessage(['packages/sync/tests/git.test.ts']);
    expect(msg.type).toBe('test');
    expect(msg.title).toBe('test: update test specifications');
  });

  it('should infer monorepo package scope when changes are localized to one package', () => {
    const msg = builder.inferMessage([
      'packages/core/src/database/schema.ts',
      'packages/core/src/index.ts'
    ]);
    expect(msg.type).toBe('feat');
    expect(msg.scope).toBe('core');
    expect(msg.title).toContain('feat(core): update 2 files');
  });

  it('should support injectable AI commit generator interface', async () => {
    const mockAIGenerator: AICommitMessageGenerator = {
      async generate() {
        return {
          type: 'refactor',
          scope: 'sync',
          title: 'refactor(sync): optimize debounce window batching'
        };
      }
    };

    const service = new CommitMessageService(mockAIGenerator);
    const msg = await service.generateMessage({
      stagedFiles: ['src/a.ts'],
      diffSummary: '1 file changed',
      diffSnippet: '...'
    });

    expect(msg.title).toBe('refactor(sync): optimize debounce window batching');
  });

  it('should gracefully fall back to heuristic when AI generator fails or throws', async () => {
    const faultyAIGenerator: AICommitMessageGenerator = {
      async generate() {
        throw new Error('AI API rate limited');
      }
    };

    const service = new CommitMessageService(faultyAIGenerator);
    const msg = await service.generateMessage({
      stagedFiles: ['docs/README.md'],
      diffSummary: '',
      diffSnippet: ''
    });

    expect(msg.type).toBe('docs');
    expect(msg.title).toContain('docs');
  });
});
