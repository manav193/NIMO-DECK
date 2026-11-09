import fs from 'node:fs';
import path from 'node:path';
import type { GoogleDriveClient } from '../client/drive-client.js';
import type { DriveUploadResult } from '../client/types.js';

export class ProjectDocsMirror {
  constructor(private driveClient: GoogleDriveClient) {}

  /**
   * Discovers markdown documentation files (README, docs/**) in a project.
   */
  static findDocumentationFiles(projectPath: string): string[] {
    const docs: string[] = [];

    const rootCandidates = ['README.md', 'CONTRIBUTING.md', 'CHANGELOG.md', 'ARCHITECTURE.md'];
    for (const name of rootCandidates) {
      if (fs.existsSync(path.join(projectPath, name))) {
        docs.push(name);
      }
    }

    const docsDir = path.join(projectPath, 'docs');
    if (fs.existsSync(docsDir) && fs.statSync(docsDir).isDirectory()) {
      const walk = (dir: string) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            walk(full);
          } else if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.txt'))) {
            docs.push(path.relative(projectPath, full).replace(/\\/g, '/'));
          }
        }
      };
      walk(docsDir);
    }

    return docs;
  }

  /**
   * Mirrors all documentation files to the Google Drive project docs folder.
   */
  async mirrorDocs(projectPath: string, docsFolderId: string): Promise<DriveUploadResult[]> {
    const docFiles = ProjectDocsMirror.findDocumentationFiles(projectPath);
    const results: DriveUploadResult[] = [];

    for (const rel of docFiles) {
      const fullPath = path.join(projectPath, rel);
      const content = fs.readFileSync(fullPath);
      const name = rel.replace(/\//g, '__'); // Flatten subpaths e.g. docs__API.md

      const upload = await this.driveClient.uploadFile({
        name,
        content,
        mimeType: 'text/markdown',
        parentId: docsFolderId
      });

      results.push(upload);
    }

    return results;
  }
}
