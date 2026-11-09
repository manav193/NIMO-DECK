import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ProjectDocsMirror, GoogleDriveClient, GoogleOAuthHandler } from '../src/index.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('@nimo-deck/drive: ProjectDocsMirror', () => {
  let projectDir: string;

  beforeEach(() => {
    projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'deck-docs-mirror-'));
    fs.mkdirSync(path.join(projectDir, 'docs'), { recursive: true });

    fs.writeFileSync(path.join(projectDir, 'README.md'), '# Main Docs');
    fs.writeFileSync(path.join(projectDir, 'docs', 'API.md'), '# API Spec');
    fs.writeFileSync(path.join(projectDir, 'src.ts'), 'export const a = 1;'); // Non-doc
  });

  afterEach(() => {
    fs.rmSync(projectDir, { recursive: true, force: true });
  });

  it('should accurately discover markdown and documentation files', () => {
    const docs = ProjectDocsMirror.findDocumentationFiles(projectDir);
    expect(docs).toContain('README.md');
    expect(docs).toContain('docs/API.md');
    expect(docs).not.toContain('src.ts');
  });

  it('should mirror discovered documentation files to Drive docs folder', async () => {
    const uploadedFiles: string[] = [];

    const mockFetcher: typeof fetch = async (input, init) => {
      const url = String(input);
      if (url.includes('/files?uploadType=multipart')) {
        uploadedFiles.push(url);
        return new Response(
          JSON.stringify({
            id: `doc-file-${uploadedFiles.length}`,
            name: 'mirrored-doc.md'
          }),
          { status: 200 }
        );
      }
      return new Response('{}', { status: 200 });
    };

    const oauth = new GoogleOAuthHandler({ clientId: 'id', clientSecret: 'sec' });
    oauth.setManualToken({ accessToken: 'valid_token', expiresAt: Date.now() + 100000 });
    const driveClient = new GoogleDriveClient({ oauthHandler: oauth, fetcher: mockFetcher });

    const mirror = new ProjectDocsMirror(driveClient);
    const results = await mirror.mirrorDocs(projectDir, 'folder-docs-id');

    expect(results).toHaveLength(2); // README.md and docs/API.md
    expect(uploadedFiles).toHaveLength(2);
  });
});
