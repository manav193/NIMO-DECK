"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_js_1 = require("../src/index.js");
(0, vitest_1.describe)('@nimo-deck/core: Typed EventBus', () => {
    (0, vitest_1.it)('should deliver typed events to registered listeners', () => {
        const bus = new index_js_1.DeckEventBus();
        const receivedEvents = [];
        bus.on('project:created', (project) => {
            receivedEvents.push(`created:${project.name}`);
        });
        bus.on('project:deleted', (projectId) => {
            receivedEvents.push(`deleted:${projectId}`);
        });
        bus.emit('project:created', {
            id: 'p-1',
            name: 'Test Project',
            localPath: '/test',
            status: 'ACTIVE',
            createdAt: new Date(),
            updatedAt: new Date()
        });
        bus.emit('project:deleted', 'p-1');
        (0, vitest_1.expect)(receivedEvents).toEqual(['created:Test Project', 'deleted:p-1']);
    });
    (0, vitest_1.it)('should properly unsubscribe listeners', () => {
        const bus = new index_js_1.DeckEventBus();
        let callCount = 0;
        const listener = () => {
            callCount++;
        };
        bus.on('sync:push_succeeded', listener);
        bus.emit('sync:push_succeeded', { projectId: 'p1', branch: 'main', sha: 'abc' });
        (0, vitest_1.expect)(callCount).toBe(1);
        bus.off('sync:push_succeeded', listener);
        bus.emit('sync:push_succeeded', { projectId: 'p1', branch: 'main', sha: 'def' });
        (0, vitest_1.expect)(callCount).toBe(1);
    });
});
//# sourceMappingURL=event-bus.test.js.map