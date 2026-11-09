import { describe, it, expect } from 'vitest';
import { DeckEventBus } from '../src/index.js';

describe('@nimo-deck/core: Typed EventBus', () => {
  it('should deliver typed events to registered listeners', () => {
    const bus = new DeckEventBus();
    const receivedEvents: string[] = [];

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

    expect(receivedEvents).toEqual(['created:Test Project', 'deleted:p-1']);
  });

  it('should properly unsubscribe listeners', () => {
    const bus = new DeckEventBus();
    let callCount = 0;

    const listener = () => {
      callCount++;
    };

    bus.on('sync:push_succeeded', listener);
    bus.emit('sync:push_succeeded', { projectId: 'p1', branch: 'main', sha: 'abc' });
    expect(callCount).toBe(1);

    bus.off('sync:push_succeeded', listener);
    bus.emit('sync:push_succeeded', { projectId: 'p1', branch: 'main', sha: 'def' });
    expect(callCount).toBe(1);
  });
});
