import { execFile } from 'node:child_process';
import type { GitExecutionResult } from './types.js';

export interface GitCLIOptions {
  timeoutMs?: number;
  maxBufferBytes?: number;
  allowDestructive?: boolean;
}

export class GitCLI {
  constructor(public readonly defaultCwd?: string) {}

  /**
   * Executes a Git command safely using execFile with argument arrays.
   * Shell injection is completely blocked as no shell is spawned.
   */
  async exec(
    args: string[],
    cwd: string = this.defaultCwd || process.cwd(),
    options: GitCLIOptions = {}
  ): Promise<GitExecutionResult> {
    const timeout = options.timeoutMs ?? 30000;
    const maxBuffer = options.maxBufferBytes ?? 10 * 1024 * 1024; // 10MB

    // Enforce safety invariant: block forbidden destructive flags in automated sync
    if (!options.allowDestructive) {
      this.assertSafeArguments(args);
    }

    const start = Date.now();
    const commandStr = `git ${args.join(' ')}`;

    return new Promise((resolve) => {
      execFile(
        'git',
        args,
        {
          cwd,
          timeout,
          maxBuffer,
          windowsHide: true
        },
        (error, stdout, stderr) => {
          const durationMs = Date.now() - start;
          const stdoutStr = stdout ? stdout.toString().trim() : '';
          const stderrStr = stderr ? stderr.toString().trim() : '';

          if (error) {
            // If the command failed with a non-zero exit code or timeout
            const exitCode = typeof error.code === 'number' ? error.code : 1;
            resolve({
              exitCode,
              stdout: stdoutStr,
              stderr: stderrStr || error.message,
              durationMs,
              command: commandStr
            });
            return;
          }

          resolve({
            exitCode: 0,
            stdout: stdoutStr,
            stderr: stderrStr,
            durationMs,
            command: commandStr
          });
        }
      );
    });
  }

  /**
   * Asserts that the provided arguments do not contain dangerous destructive flags.
   */
  private assertSafeArguments(args: string[]): void {
    const forbidden = [
      '--force',
      '-f',
      '--force-with-lease',
      '--hard',
      '--delete',
      'clean'
    ];

    for (const arg of args) {
      const lower = arg.toLowerCase();
      if (forbidden.includes(lower)) {
        throw new Error(
          `[NIMO-DECK Safety Violation] Prohibited destructive Git argument detected: "${arg}". Automated routines cannot execute destructive operations.`
        );
      }
    }
  }

  /**
   * Checks whether the current working directory is a valid git repository.
   */
  async isGitRepo(cwd: string = this.defaultCwd || process.cwd()): Promise<boolean> {
    const res = await this.exec(['rev-parse', '--is-inside-work-tree'], cwd);
    return res.exitCode === 0 && res.stdout === 'true';
  }

  /**
   * Returns the absolute path of the repository root.
   */
  async getRepoRoot(cwd: string = this.defaultCwd || process.cwd()): Promise<string | null> {
    const res = await this.exec(['rev-parse', '--show-toplevel'], cwd);
    return res.exitCode === 0 ? res.stdout : null;
  }
}
