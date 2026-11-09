"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_js_1 = require("../src/index.js");
(0, vitest_1.describe)('@nimo-deck/shared: Entropy & Secret Detection', () => {
    (0, vitest_1.it)('should calculate low entropy for repetitive English text', () => {
        const text = 'aaaaabbbbbccccc';
        const entropy = (0, index_js_1.calculateShannonEntropy)(text);
        (0, vitest_1.expect)(entropy).toBeLessThan(2.0);
    });
    (0, vitest_1.it)('should calculate high entropy (> 4.0) for cryptographic random strings', () => {
        // 32-byte hex/base64-like random key
        const secretKey = '8f3a9e2b1c4d7f0a6e5b8c1d3f7a9e2b';
        const entropy = (0, index_js_1.calculateShannonEntropy)(secretKey);
        (0, vitest_1.expect)(entropy).toBeGreaterThan(3.5);
    });
    (0, vitest_1.it)('should detect known secret signatures', () => {
        const gitHubToken = 'ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        (0, vitest_1.expect)((0, index_js_1.isProbableSecret)(gitHubToken)).toBe(true);
        const openAiKey = 'sk-abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOP';
        (0, vitest_1.expect)((0, index_js_1.isProbableSecret)(openAiKey)).toBe(true);
        const privateKey = '-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA0...';
        (0, vitest_1.expect)((0, index_js_1.isProbableSecret)(privateKey)).toBe(true);
    });
    (0, vitest_1.it)('should not flag normal code or variable names as secrets', () => {
        (0, vitest_1.expect)((0, index_js_1.isProbableSecret)('const activeProjectsCount = 42;')).toBe(false);
        (0, vitest_1.expect)((0, index_js_1.isProbableSecret)('function calculateDebounceWindow() { return 5000; }')).toBe(false);
        (0, vitest_1.expect)((0, index_js_1.isProbableSecret)('import { describe, it, expect } from "vitest";')).toBe(false);
    });
    (0, vitest_1.it)('should correctly match immutable ignored paths across platforms', () => {
        (0, vitest_1.expect)((0, index_js_1.isImmutableIgnored)('.env')).toBe(true);
        (0, vitest_1.expect)((0, index_js_1.isImmutableIgnored)('.env.local')).toBe(true);
        (0, vitest_1.expect)((0, index_js_1.isImmutableIgnored)('.env.production')).toBe(true);
        (0, vitest_1.expect)((0, index_js_1.isImmutableIgnored)('src/config/.env')).toBe(true);
        (0, vitest_1.expect)((0, index_js_1.isImmutableIgnored)('node_modules/react/index.js')).toBe(true);
        (0, vitest_1.expect)((0, index_js_1.isImmutableIgnored)('dist/bundle.js')).toBe(true);
        (0, vitest_1.expect)((0, index_js_1.isImmutableIgnored)('target/release/app')).toBe(true);
        (0, vitest_1.expect)((0, index_js_1.isImmutableIgnored)('id_rsa')).toBe(true);
        (0, vitest_1.expect)((0, index_js_1.isImmutableIgnored)('server.key')).toBe(true);
        (0, vitest_1.expect)((0, index_js_1.isImmutableIgnored)('cert.pem')).toBe(true);
        // Should NOT ignore legitimate source files
        (0, vitest_1.expect)((0, index_js_1.isImmutableIgnored)('src/components/Header.tsx')).toBe(false);
        (0, vitest_1.expect)((0, index_js_1.isImmutableIgnored)('docs/ARCHITECTURE.md')).toBe(false);
        (0, vitest_1.expect)((0, index_js_1.isImmutableIgnored)('package.json')).toBe(false);
    });
});
//# sourceMappingURL=entropy.test.js.map