import path from 'node:path';
import type { ScannedFile, TestStructureSummary } from './types.js';

export class TestStructureAnalyzer {
  static analyze(files: ScannedFile[]): TestStructureSummary {
    const testFiles: string[] = [];
    const sourceFiles: string[] = [];

    for (const f of files) {
      const rel = f.relativePath;
      const lower = rel.toLowerCase();
      const isTest =
        lower.includes('.test.') ||
        lower.includes('.spec.') ||
        lower.includes('/tests/') ||
        lower.includes('/__tests__/') ||
        lower.includes('\\tests\\') ||
        lower.includes('\\__tests__\\');

      if (isTest && (f.extension === '.ts' || f.extension === '.tsx' || f.extension === '.js')) {
        testFiles.push(rel);
      } else if (
        (f.extension === '.ts' || f.extension === '.tsx') &&
        !lower.endsWith('.d.ts') &&
        !lower.includes('index.ts')
      ) {
        sourceFiles.push(rel);
      }
    }

    // Determine likely test framework from filenames or package patterns
    let framework = 'Unknown';
    if (files.some((f) => f.relativePath.includes('vitest.config'))) {
      framework = 'Vitest';
    } else if (files.some((f) => f.relativePath.includes('jest.config'))) {
      framework = 'Jest';
    } else if (testFiles.length > 0) {
      framework = 'Vitest/Jest-compatible';
    }

    // Match source files against corresponding test files
    const testedSourceStems = new Set<string>();
    for (const tf of testFiles) {
      const base = path.basename(tf).replace(/\.(test|spec)\.(ts|tsx|js)$/, '');
      testedSourceStems.add(base);
    }

    const sourceFilesWithoutTests = sourceFiles.filter((sf) => {
      const base = path.basename(sf).replace(/\.(ts|tsx|js)$/, '');
      return !testedSourceStems.has(base);
    });

    return {
      testFileCount: testFiles.length,
      testFramework: framework,
      testFiles,
      sourceFilesWithoutTests
    };
  }
}
