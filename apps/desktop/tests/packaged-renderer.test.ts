import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Desktop Packaged Renderer & Distribution Verification', () => {
  const desktopRoot = path.resolve(__dirname, '..');
  const distPath = path.join(desktopRoot, 'dist');
  const rendererPath = path.join(distPath, 'renderer');
  const mainBundlePath = path.join(distPath, 'main', 'main.js');
  const preloadBundlePath = path.join(distPath, 'preload', 'preload.js');

  it('generates production bundled renderer index.html', () => {
    const indexPath = path.join(rendererPath, 'index.html');
    expect(fs.existsSync(indexPath)).toBe(true);

    const html = fs.readFileSync(indexPath, 'utf-8');
    expect(html).toContain('id="root"');
    expect(html).toContain('<script type="module" crossorigin src="./assets/');
    expect(html).toContain('<link rel="stylesheet" crossorigin href="./assets/');
    expect(html).toContain('Content-Security-Policy');
  });

  it('bundles production JavaScript and CSS assets for the React dashboard', () => {
    const assetsDir = path.join(rendererPath, 'assets');
    expect(fs.existsSync(assetsDir)).toBe(true);

    const assetFiles = fs.readdirSync(assetsDir);
    const jsAsset = assetFiles.find((f) => f.endsWith('.js'));
    const cssAsset = assetFiles.find((f) => f.endsWith('.css'));

    expect(jsAsset).toBeDefined();
    expect(cssAsset).toBeDefined();

    const jsContent = fs.readFileSync(path.join(assetsDir, jsAsset!), 'utf-8');
    // Ensure dashboard components are bundled, not an empty shell
    expect(jsContent).toContain('deckAPI');
    expect(jsContent.length).toBeGreaterThan(100000); // Substantial React application

    const cssContent = fs.readFileSync(path.join(assetsDir, cssAsset!), 'utf-8');
    expect(cssContent).toContain('--deck-bg-navy');
    expect(cssContent).toContain('--deck-accent-blue');
  });

  it('bundles main process and preload script with context isolation and sandbox invariants', () => {
    expect(fs.existsSync(mainBundlePath)).toBe(true);
    expect(fs.existsSync(preloadBundlePath)).toBe(true);

    const mainContent = fs.readFileSync(mainBundlePath, 'utf-8');
    expect(mainContent).toContain('contextIsolation: true');
    expect(mainContent).toContain('nodeIntegration: false');
    expect(mainContent).toContain('sandbox: true');
    expect(mainContent).toContain('../renderer/index.html');
    expect(mainContent).toContain('../preload/preload.js');

    const preloadContent = fs.readFileSync(preloadBundlePath, 'utf-8');
    expect(preloadContent).toContain('exposeInMainWorld');
    expect(preloadContent).toContain('deckAPI');
  });
});
