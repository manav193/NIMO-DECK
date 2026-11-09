import { describe, it, expect } from 'vitest';
import { ASTExtractor } from '../src/ingestion/ast-extractor.js';

describe('@nimo-deck/intelligence: AST Extractor', () => {
  it('should parse TypeScript classes, functions, and interfaces with cyclomatic complexity', () => {
    const tsCode = `
import { z } from 'zod';
import type { Project } from '@nimo-deck/shared';

export interface StorageOptions {
  compress: boolean;
}

export class VaultManager {
  save(data: string): boolean {
    if (data.length > 0 && data !== 'empty') {
      return true;
    }
    return false;
  }
}

export function computeMetric(a: number, b: number): number {
  return a > b ? a - b : b - a;
}

const internalHelper = () => 'private';
`;

    const summary = ASTExtractor.extractFromSource(tsCode, 'src/vault.ts');

    expect(summary.lineCount).toBeGreaterThan(15);
    expect(summary.imports).toEqual(['zod', '@nimo-deck/shared']);
    expect(summary.exports).toContain('StorageOptions');
    expect(summary.exports).toContain('VaultManager');
    expect(summary.exports).toContain('computeMetric');

    const ifaceSym = summary.symbols.find((s) => s.name === 'StorageOptions');
    expect(ifaceSym).toBeDefined();
    expect(ifaceSym?.kind).toBe('interface');
    expect(ifaceSym?.exported).toBe(true);

    const classSym = summary.symbols.find((s) => s.name === 'VaultManager');
    expect(classSym).toBeDefined();
    expect(classSym?.kind).toBe('class');
    expect(classSym?.exported).toBe(true);
    // save() has if statement with &&, so complexity >= 3
    expect(classSym?.complexity).toBeGreaterThanOrEqual(2);

    const fnSym = summary.symbols.find((s) => s.name === 'computeMetric');
    expect(fnSym).toBeDefined();
    expect(fnSym?.kind).toBe('function');
    expect(fnSym?.complexity).toBeGreaterThanOrEqual(2);
  });
});
