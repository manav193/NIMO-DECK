"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_js_1 = require("../src/index.js");
(0, vitest_1.describe)('@nimo-deck/shared: Zod Schema Contracts', () => {
    (0, vitest_1.it)('should validate valid Project schemas', () => {
        const valid = {
            id: '123e4567-e89b-12d3-a456-426614174000',
            name: 'NIMO-DECK',
            localPath: 'C:\\Users\\manav\\OneDrive\\NIMO-DECK',
            gitRemoteUrl: 'https://github.com/manav193/NIMO-DECK',
            status: 'ACTIVE',
            createdAt: new Date(),
            updatedAt: new Date()
        };
        const parsed = index_js_1.ProjectSchema.safeParse(valid);
        (0, vitest_1.expect)(parsed.success).toBe(true);
    });
    (0, vitest_1.it)('should reject invalid project paths or malformed URLs', () => {
        const invalid = {
            id: '123e4567-e89b-12d3-a456-426614174000',
            name: '', // Empty name not allowed
            localPath: '',
            gitRemoteUrl: 'not-a-valid-url'
        };
        const parsed = index_js_1.CreateProjectInputSchema.safeParse(invalid);
        (0, vitest_1.expect)(parsed.success).toBe(false);
    });
    (0, vitest_1.it)('should enforce default values in SyncConfigSchema', () => {
        const parsed = index_js_1.SyncConfigSchema.parse({
            projectId: '123e4567-e89b-12d3-a456-426614174000',
            updatedAt: new Date()
        });
        (0, vitest_1.expect)(parsed.autoCommitEnabled).toBe(true);
        (0, vitest_1.expect)(parsed.debounceWindowMs).toBe(5000);
        (0, vitest_1.expect)(parsed.maxWaitMs).toBe(30000);
        (0, vitest_1.expect)(parsed.autoPushMode).toBe('ON_COMMIT');
        (0, vitest_1.expect)(parsed.aiCommitMessages).toBe(false);
    });
    (0, vitest_1.it)('should validate AIRecommendation with fact-vs-hypothesis separation', () => {
        const recommendation = {
            id: '123e4567-e89b-12d3-a456-426614174001',
            analysisId: '123e4567-e89b-12d3-a456-426614174002',
            projectId: '123e4567-e89b-12d3-a456-426614174000',
            title: 'Upgrade React to v19',
            category: 'VERIFIED_FACT',
            severity: 'MEDIUM',
            complexity: 'M',
            reasoning: 'package.json references outdated version',
            expectedBenefits: 'Concurrent rendering improvements',
            dependencies: ['react@19.0.0', 'react-dom@19.0.0'],
            implementationSteps: ['Run npm install react@19', 'Update components'],
            status: 'PROPOSED',
            createdAt: new Date()
        };
        const parsed = index_js_1.AIRecommendationSchema.safeParse(recommendation);
        (0, vitest_1.expect)(parsed.success).toBe(true);
    });
    (0, vitest_1.it)('should reject invalid category in AIRecommendation', () => {
        const invalid = {
            id: '123e4567-e89b-12d3-a456-426614174001',
            analysisId: '123e4567-e89b-12d3-a456-426614174002',
            projectId: '123e4567-e89b-12d3-a456-426614174000',
            title: 'Test',
            category: 'GUESS', // Invalid
            severity: 'LOW',
            complexity: 'S',
            reasoning: 'none',
            expectedBenefits: 'none',
            dependencies: [],
            implementationSteps: [],
            createdAt: new Date()
        };
        const parsed = index_js_1.AIRecommendationSchema.safeParse(invalid);
        (0, vitest_1.expect)(parsed.success).toBe(false);
    });
    (0, vitest_1.it)('should validate AuditLogEntrySchema with SHA-256 hashes', () => {
        const entry = {
            id: '123e4567-e89b-12d3-a456-426614174003',
            projectId: '123e4567-e89b-12d3-a456-426614174000',
            actor: 'SYSTEM',
            action: 'GIT_COMMIT',
            payloadHash: 'a'.repeat(64),
            prevLogHash: 'b'.repeat(64),
            entryHash: 'c'.repeat(64),
            createdAt: new Date()
        };
        const parsed = index_js_1.AuditLogEntrySchema.safeParse(entry);
        (0, vitest_1.expect)(parsed.success).toBe(true);
    });
});
//# sourceMappingURL=schemas.test.js.map