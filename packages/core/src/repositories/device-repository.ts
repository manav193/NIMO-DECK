import { eq, desc, and } from 'drizzle-orm';
import type { DeckDatabase } from '../database/connection.js';
import { devices, deviceSyncStates } from '../database/schema.js';
import type { Device, DeviceStatus, DeviceType } from '@nimo-deck/shared';
import crypto from 'node:crypto';

export class DeviceRepository {
  constructor(private db: DeckDatabase) {}

  registerDevice(params: {
    name: string;
    fingerprint: string;
    deviceType: DeviceType;
    publicKey: string;
    clientVersion?: string;
    ipAddress?: string;
  }): Device {
    const existing = this.findByFingerprint(params.fingerprint);
    if (existing) {
      this.db
        .update(devices)
        .set({
          name: params.name,
          deviceType: params.deviceType,
          publicKey: params.publicKey,
          clientVersion: params.clientVersion || existing.clientVersion,
          ipAddress: params.ipAddress,
          lastSeenAt: new Date()
        })
        .where(eq(devices.id, existing.id))
        .run();
      return this.getById(existing.id)!;
    }

    const id = crypto.randomUUID();
    const now = new Date();

    const record: typeof devices.$inferInsert = {
      id,
      name: params.name,
      fingerprint: params.fingerprint,
      deviceType: params.deviceType,
      status: 'ACTIVE',
      publicKey: params.publicKey,
      clientVersion: params.clientVersion || '0.1.0',
      ipAddress: params.ipAddress,
      lastSeenAt: now,
      createdAt: now
    };

    this.db.insert(devices).values(record).run();
    return this.getById(id)!;
  }

  getById(id: string): Device | null {
    const row = this.db.select().from(devices).where(eq(devices.id, id)).get();
    if (!row) return null;
    return this.mapDevice(row);
  }

  findByFingerprint(fingerprint: string): Device | null {
    const row = this.db.select().from(devices).where(eq(devices.fingerprint, fingerprint)).get();
    if (!row) return null;
    return this.mapDevice(row);
  }

  listAll(): Device[] {
    const rows = this.db.select().from(devices).orderBy(desc(devices.lastSeenAt)).all();
    return rows.map(this.mapDevice);
  }

  updateStatus(id: string, status: DeviceStatus): void {
    this.db
      .update(devices)
      .set({ status, lastSeenAt: new Date() })
      .where(eq(devices.id, id))
      .run();
  }

  touchLastSeen(id: string, ipAddress?: string): void {
    this.db
      .update(devices)
      .set({
        lastSeenAt: new Date(),
        ...(ipAddress ? { ipAddress } : {})
      })
      .where(eq(devices.id, id))
      .run();
  }

  recordProjectSync(params: {
    deviceId: string;
    projectId: string;
    lastSyncedAuditSeq: number;
    lastSyncedHeadSha?: string;
  }): void {
    const existing = this.db
      .select()
      .from(deviceSyncStates)
      .where(
        and(
          eq(deviceSyncStates.deviceId, params.deviceId),
          eq(deviceSyncStates.projectId, params.projectId)
        )
      )
      .get();

    const now = new Date();
    if (existing) {
      this.db
        .update(deviceSyncStates)
        .set({
          lastSyncedAuditSeq: params.lastSyncedAuditSeq,
          lastSyncedHeadSha: params.lastSyncedHeadSha || existing.lastSyncedHeadSha,
          syncedAt: now
        })
        .where(eq(deviceSyncStates.id, existing.id))
        .run();
    } else {
      const id = crypto.randomUUID();
      this.db
        .insert(deviceSyncStates)
        .values({
          id,
          deviceId: params.deviceId,
          projectId: params.projectId,
          lastSyncedAuditSeq: params.lastSyncedAuditSeq,
          lastSyncedHeadSha: params.lastSyncedHeadSha,
          syncedAt: now
        })
        .run();
    }
  }

  getProjectSyncState(deviceId: string, projectId: string) {
    return this.db
      .select()
      .from(deviceSyncStates)
      .where(
        and(
          eq(deviceSyncStates.deviceId, deviceId),
          eq(deviceSyncStates.projectId, projectId)
        )
      )
      .get() || null;
  }

  private mapDevice(row: typeof devices.$inferSelect): Device {
    return {
      id: row.id,
      name: row.name,
      fingerprint: row.fingerprint,
      deviceType: row.deviceType as DeviceType,
      status: row.status as DeviceStatus,
      publicKey: row.publicKey,
      clientVersion: row.clientVersion,
      ipAddress: row.ipAddress ?? undefined,
      lastSeenAt: row.lastSeenAt ?? undefined,
      createdAt: row.createdAt
    };
  }
}
