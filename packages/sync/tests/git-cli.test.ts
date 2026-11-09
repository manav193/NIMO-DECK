import { describe, it, expect } from 'vitest';
import { GitCLI } from '../src/index.js';

describe('@nimo-deck/sync: GitCLI Safety & Execution', () => {
  const git = new GitCLI();

  it('should execute non-destructive git commands and return structured results', async () => {
    const res = await git.exec(['--version']);
    expect(res.exitCode).toBe(0);
    expect(res.stdout).toContain('git version');
    expect(res.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('should throw an error if forbidden destructive arguments are passed', async () => {
    await expect(git.exec(['push', '--force'])).rejects.toThrow(
      /Prohibited destructive Git argument detected/
    );

    await expect(git.exec(['push', '-f'])).rejects.toThrow(
      /Prohibited destructive Git argument detected/
    );

    await expect(git.exec(['reset', '--hard'])).rejects.toThrow(
      /Prohibited destructive Git argument detected/
    );

    await expect(git.exec(['clean', '-fd'])).rejects.toThrow(
      /Prohibited destructive Git argument detected/
    );
  });

  it('should capture non-zero exit codes gracefully without crashing', async () => {
    // Non-existent git subcommand
    const res = await git.exec(['invalid-subcommand-xyz']);
    expect(res.exitCode).not.toBe(0);
    expect(res.stderr).toContain('is not a git command');
  });

  it('should accurately identify git repositories', async () => {
    const isRepo = await git.isGitRepo(process.cwd());
    expect(isRepo).toBe(true);

    const root = await git.getRepoRoot(process.cwd());
    expect(root).not.toBeNull();
    expect(root?.toLowerCase()).toContain('nimo-deck');
  });
});
