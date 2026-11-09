import ts from 'typescript';
import fs from 'node:fs';
import type { ASTSymbol, FileASTSummary } from './types.js';

export class ASTExtractor {
  /**
   * Parses a TypeScript or JavaScript file and extracts symbols, imports, exports, and complexity.
   */
  static extractFromFile(filePath: string, relativePath: string): FileASTSummary {
    let content = '';
    try {
      content = fs.readFileSync(filePath, 'utf8');
    } catch {
      return {
        relativePath,
        symbols: [],
        imports: [],
        exports: [],
        lineCount: 0,
        hasTests: false
      };
    }

    return this.extractFromSource(content, relativePath);
  }

  static extractFromSource(sourceText: string, relativePath: string): FileASTSummary {
    const sourceFile = ts.createSourceFile(
      relativePath,
      sourceText,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX
    );

    const symbols: ASTSymbol[] = [];
    const imports: string[] = [];
    const exports: string[] = [];
    const lineCount = sourceText.split(/\r?\n/).length;
    const hasTests = /describe\(|it\(|test\(|expect\(/i.test(sourceText);

    function getLineNumber(pos: number): number {
      return sourceFile.getLineAndCharacterOfPosition(pos).line + 1;
    }

    function calculateComplexity(node: ts.Node): number {
      let complexity = 1;
      function walkComplexity(n: ts.Node) {
        switch (n.kind) {
          case ts.SyntaxKind.IfStatement:
          case ts.SyntaxKind.ForStatement:
          case ts.SyntaxKind.ForInStatement:
          case ts.SyntaxKind.ForOfStatement:
          case ts.SyntaxKind.WhileStatement:
          case ts.SyntaxKind.DoStatement:
          case ts.SyntaxKind.CatchClause:
          case ts.SyntaxKind.ConditionalExpression:
          case ts.SyntaxKind.CaseClause:
            complexity++;
            break;
          case ts.SyntaxKind.BinaryExpression: {
            const op = (n as ts.BinaryExpression).operatorToken.kind;
            if (
              op === ts.SyntaxKind.AmpersandAmpersandToken ||
              op === ts.SyntaxKind.BarBarToken ||
              op === ts.SyntaxKind.QuestionQuestionToken
            ) {
              complexity++;
            }
            break;
          }
        }
        ts.forEachChild(n, walkComplexity);
      }
      walkComplexity(node);
      return complexity;
    }

    function hasExportModifier(node: ts.Node): boolean {
      if (ts.canHaveModifiers(node)) {
        const modifiers = ts.getModifiers(node);
        if (modifiers) {
          return modifiers.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
        }
      }
      return false;
    }

    function visit(node: ts.Node) {
      if (ts.isImportDeclaration(node)) {
        const moduleSpecifier = node.moduleSpecifier;
        if (ts.isStringLiteral(moduleSpecifier)) {
          imports.push(moduleSpecifier.text);
        }
      } else if (ts.isExportDeclaration(node)) {
        if (node.exportClause && ts.isNamedExports(node.exportClause)) {
          for (const spec of node.exportClause.elements) {
            exports.push(spec.name.text);
          }
        }
      } else if (ts.isClassDeclaration(node) && node.name) {
        const isExp = hasExportModifier(node);
        if (isExp) exports.push(node.name.text);
        symbols.push({
          name: node.name.text,
          kind: 'class',
          exported: isExp,
          lineStart: getLineNumber(node.getStart(sourceFile)),
          lineEnd: getLineNumber(node.getEnd()),
          complexity: calculateComplexity(node)
        });
      } else if (ts.isFunctionDeclaration(node) && node.name) {
        const isExp = hasExportModifier(node);
        if (isExp) exports.push(node.name.text);
        symbols.push({
          name: node.name.text,
          kind: 'function',
          exported: isExp,
          lineStart: getLineNumber(node.getStart(sourceFile)),
          lineEnd: getLineNumber(node.getEnd()),
          complexity: calculateComplexity(node)
        });
      } else if (ts.isInterfaceDeclaration(node)) {
        const isExp = hasExportModifier(node);
        if (isExp) exports.push(node.name.text);
        symbols.push({
          name: node.name.text,
          kind: 'interface',
          exported: isExp,
          lineStart: getLineNumber(node.getStart(sourceFile)),
          lineEnd: getLineNumber(node.getEnd()),
          complexity: 1
        });
      } else if (ts.isTypeAliasDeclaration(node)) {
        const isExp = hasExportModifier(node);
        if (isExp) exports.push(node.name.text);
        symbols.push({
          name: node.name.text,
          kind: 'type',
          exported: isExp,
          lineStart: getLineNumber(node.getStart(sourceFile)),
          lineEnd: getLineNumber(node.getEnd()),
          complexity: 1
        });
      } else if (ts.isEnumDeclaration(node)) {
        const isExp = hasExportModifier(node);
        if (isExp) exports.push(node.name.text);
        symbols.push({
          name: node.name.text,
          kind: 'enum',
          exported: isExp,
          lineStart: getLineNumber(node.getStart(sourceFile)),
          lineEnd: getLineNumber(node.getEnd()),
          complexity: 1
        });
      }

      ts.forEachChild(node, visit);
    }

    visit(sourceFile);

    return {
      relativePath,
      symbols,
      imports: Array.from(new Set(imports)),
      exports: Array.from(new Set(exports)),
      lineCount,
      hasTests
    };
  }
}
