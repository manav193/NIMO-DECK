"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_js_1 = require("../src/index.js");
(0, vitest_1.describe)('@nimo-deck/shared: Cryptographic Hashing', () => {
    (0, vitest_1.it)('should compute valid 64-character SHA-256 hex digests', () => {
        const hash = (0, index_js_1.sha256)('hello nimo-deck');
        (0, vitest_1.expect)(hash).toHaveLength(64);
        (0, vitest_1.expect)(hash).toMatch(/^[a-f0-9]{64}$/);
    });
    (0, vitest_1.it)('should produce identical payload hashes regardless of object key insertion order', () => {
        const objA = { z: 100, a: 'test', m: true };
        const objB = { a: 'test', m: true, z: 100 };
        const hashA = (0, index_js_1.hashPayload)(objA);
        const hashB = (0, index_js_1.hashPayload)(objB);
        (0, vitest_1.expect)(hashA).toBe(hashB);
    });
    (0, vitest_1.it)('should compute tamper-evident audit log chain hashes', () => {
        const prevHash = '0000000000000000000000000000000000000000000000000000000000000000';
        const entry1 = {
            prevLogHash: prevHash,
            id: 'uuid-1',
            actor: 'SYSTEM',
            action: 'GIT_COMMIT',
            payloadHash: (0, index_js_1.sha256)('payload1'),
            createdAt: 1700000000000
        };
        const hash1 = (0, index_js_1.computeAuditChainHash)(entry1);
        (0, vitest_1.expect)(hash1).toHaveLength(64);
        const entry2 = {
            prevLogHash: hash1,
            id: 'uuid-2',
            actor: 'USER',
            action: 'DRIVE_SNAPSHOT',
            payloadHash: (0, index_js_1.sha256)('payload2'),
            createdAt: 1700000001000
        };
        const hash2 = (0, index_js_1.computeAuditChainHash)(entry2);
        (0, vitest_1.expect)(hash2).toHaveLength(64);
        (0, vitest_1.expect)(hash2).not.toBe(hash1);
    });
});
//# sourceMappingURL=hash.test.js.map