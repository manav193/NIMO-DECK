export interface ScannedFile {
  relativePath: string;
  fullPath: string;
  sha256: string;
  sizeBytes: number;
  extension: string;
}

export type ASTSymbolKind = 'class' | 'function' | 'interface' | 'type' | 'variable' | 'enum';

export interface ASTSymbol {
  name: string;
  kind: ASTSymbolKind;
  exported: boolean;
  lineStart: number;
  lineEnd: number;
  complexity?: number;
}

export interface FileASTSummary {
  relativePath: string;
  symbols: ASTSymbol[];
  imports: string[];
  exports: string[];
  lineCount: number;
  hasTests: boolean;
}

export interface ManifestSummary {
  name?: string;
  version?: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  scripts: Record<string, string>;
  engines?: Record<string, string>;
}

export interface TestStructureSummary {
  testFileCount: number;
  testFramework: string;
  testFiles: string[];
  sourceFilesWithoutTests: string[];
}

export interface GitCommitSummary {
  sha: string;
  author: string;
  message: string;
  committedAt: Date;
  filesChanged: string[];
}

export interface ProjectIngestionContext {
  projectId: string;
  projectName: string;
  topology: string[];
  manifests: ManifestSummary[];
  documentation: Array<{ path: string; content: string }>;
  astSummaries: FileASTSummary[];
  testStructure: TestStructureSummary;
  recentCommits: GitCommitSummary[];
  totalFilesScanned: number;
  contentHash: string;
}
