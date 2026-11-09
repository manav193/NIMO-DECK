import type { ProjectIngestionContext } from './types.js';
import { SecretRedactor } from '../security/secret-redactor.js';
import { PromptInjectionGuard } from '../security/prompt-injection-guard.js';

export interface ContextPackerOptions {
  maxTokens?: number;
}

export class ContextPacker {
  /**
   * Packs structured project ingestion details into an optimized, sanitized
   * prompt context payload within a strict token budget.
   */
  static pack(context: ProjectIngestionContext, options: ContextPackerOptions = {}): string {
    const maxTokens = options.maxTokens ?? 32000;
    const maxChars = maxTokens * 4;

    const sections: string[] = [];

    // 1. Project header & Topology overview
    sections.push(`=== PROJECT TOPOLOGY: ${context.projectName} ===`);
    sections.push(`Total Files Discovered: ${context.totalFilesScanned}`);
    const topologySummary = context.topology.slice(0, 100).join('\n');
    sections.push(`Directory Structure Preview:\n${topologySummary}\n`);

    // 2. Package Manifests & Dependencies
    if (context.manifests.length > 0) {
      sections.push('=== PACKAGE MANIFESTS & DEPENDENCIES ===');
      for (const m of context.manifests) {
        sections.push(
          `Manifest: ${m.name || 'unnamed'}@${m.version || '0.0.0'}\n` +
          `Dependencies: ${JSON.stringify(m.dependencies, null, 2)}\n` +
          `DevDependencies: ${JSON.stringify(m.devDependencies, null, 2)}\n` +
          `Scripts: ${JSON.stringify(m.scripts, null, 2)}\n`
        );
      }
    }

    // 3. Test Structure & Coverage Gap
    sections.push('=== TEST STRUCTURE & COVERAGE ===');
    sections.push(`Framework: ${context.testStructure.testFramework}`);
    sections.push(`Test Files Count: ${context.testStructure.testFileCount}`);
    if (context.testStructure.sourceFilesWithoutTests.length > 0) {
      sections.push(
        `Source Files Without Direct Test Match (sample):\n` +
        context.testStructure.sourceFilesWithoutTests.slice(0, 20).join('\n')
      );
    }

    // 4. AST Symbol & Interface Discovery
    if (context.astSummaries.length > 0) {
      sections.push('=== CODEBASE AST EXPORTS & SYMBOLS ===');
      for (const ast of context.astSummaries.slice(0, 50)) {
        if (ast.symbols.length > 0 || ast.exports.length > 0) {
          const symStr = ast.symbols
            .map((s) => `  - ${s.kind} ${s.name} (lines ${s.lineStart}-${s.lineEnd}, complexity: ${s.complexity || 1})`)
            .join('\n');
          sections.push(`File: ${ast.relativePath} (${ast.lineCount} lines)\n${symStr}`);
        }
      }
    }

    // 5. Documentation
    if (context.documentation.length > 0) {
      sections.push('=== DOCUMENTATION & ARCHITECTURAL SPECS ===');
      for (const doc of context.documentation) {
        sections.push(`--- ${doc.path} ---\n${doc.content}\n`);
      }
    }

    // 6. Recent Git Commit History
    if (context.recentCommits.length > 0) {
      sections.push('=== RECENT GIT COMMITS ===');
      for (const c of context.recentCommits.slice(0, 15)) {
        sections.push(`commit ${c.sha.slice(0, 7)} by ${c.author}: ${c.message}`);
      }
    }

    // Assemble and apply security guards
    const rawContent = sections.join('\n\n');

    // Redact secrets
    const { sanitized: redacted } = SecretRedactor.redact(rawContent);

    // Guard against prompt injection
    const protectedContent = PromptInjectionGuard.wrapUntrusted(context.projectName, redacted);

    // Apply token budget clamp
    if (protectedContent.length > maxChars) {
      return `${protectedContent.slice(0, maxChars)}\n\n<<<CONTEXT_TRUNCATED_DUE_TO_TOKEN_BUDGET>>>`;
    }

    return protectedContent;
  }
}
