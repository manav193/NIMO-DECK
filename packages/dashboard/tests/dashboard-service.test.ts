import { describe, it, expect, beforeEach } from 'vitest';
import { DashboardService } from '../src/services/dashboard-service.js';
import { MockDashboardTransport } from '../src/services/mock-transport.js';

describe('DashboardService with MockDashboardTransport', () => {
  let service: DashboardService;
  let transport: MockDashboardTransport;

  beforeEach(() => {
    transport = new MockDashboardTransport();
    service = new DashboardService(transport);
  });

  it('retrieves overview stats correctly', async () => {
    const stats = await service.getOverviewStats();
    expect(stats).toBeDefined();
    expect(stats.totalProjects).toBeGreaterThan(0);
    expect(stats.inSyncCount).toBeGreaterThanOrEqual(0);
    expect(stats.recentSnapshotsCount).toBeGreaterThanOrEqual(0);
    expect(stats.systemHealth).toBe('HEALTHY');
  });

  it('lists registered projects and gets project by ID', async () => {
    const projects = await service.listProjects();
    expect(projects.length).toBeGreaterThan(0);

    const firstProject = projects[0];
    const retrieved = await service.getProject(firstProject.id);
    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(firstProject.id);
    expect(retrieved?.name).toBe(firstProject.name);
  });

  it('retrieves vault snapshots for a project', async () => {
    const snapshots = await service.listVaultSnapshots('proj-1');
    expect(Array.isArray(snapshots)).toBe(true);
    expect(snapshots.length).toBeGreaterThan(0);
    expect(snapshots[0].rootHash).toBeDefined();
  });

  it('verifies vault cryptographic audit chain', async () => {
    const res = await service.verifyAuditChain('proj-1');
    expect(res).toBeDefined();
    expect(res.isValid).toBe(true);
    expect(res.totalVerified).toBeGreaterThan(0);
  });

  it('retrieves AI analysis and recommendations', async () => {
    const analysis = await service.analyzeProject('proj-1');
    expect(analysis).toBeDefined();
    expect(analysis?.summaryMarkdown).toContain('NIMO-DECK');

    const recs = await service.getRecommendations('proj-1');
    expect(recs.length).toBeGreaterThan(0);

    const roadmap = await service.getRoadmap('proj-1');
    expect(roadmap).toBeDefined();
    expect(roadmap?.milestones.length).toBeGreaterThan(0);

    const memory = await service.getProjectMemory('proj-1');
    expect(memory).toBeDefined();
    expect(memory?.implementedFeatures.length).toBeGreaterThan(0);
  });

  it('retrieves and updates settings', async () => {
    const settings = await service.getSettings();
    expect(settings).toBeDefined();
    expect(settings.theme).toBe('dark');

    const updated = await service.updateSettings({ theme: 'light' });
    expect(updated.theme).toBe('light');
  });

  it('manages notifications', async () => {
    const notifications = await service.getNotifications();
    expect(notifications.length).toBeGreaterThan(0);

    const targetId = notifications[0].id;
    await service.markNotificationRead(targetId);

    const updatedList = await service.getNotifications();
    const updatedItem = updatedList.find((n) => n.id === targetId);
    expect(updatedItem?.read).toBe(true);
  });

  it('triggers git sync operations safely', async () => {
    const commitRes = await service.triggerCommit('proj-1', 'feat: update docs');
    expect(commitRes.commitSha).toBeDefined();

    await expect(service.triggerPush('proj-1')).resolves.toBeDefined();
    await expect(service.triggerPull('proj-1')).resolves.toBeDefined();
  });
});
