import type {
  CrossDeviceSyncPayload,
  CrossDeviceSyncMetadata,
  Device
} from '@nimo-deck/shared';
import type { DeviceRepository } from '../repositories/device-repository.js';
import type { ProjectRepository } from '../repositories/project-repository.js';
import type { AuditLogRepository } from '../repositories/audit-log-repository.js';
import type { ProductionLogger } from '../logging/production-logger.js';
import crypto from 'node:crypto';

export interface CloudFederationConfig {
  cloudEndpoint?: string;
  authToken?: string;
  deviceId: string;
  enableCloudSync?: boolean;
}

export interface SyncConflictReport {
  projectId: string;
  projectName: string;
  localHeadSha?: string;
  remoteDeviceHeadSha?: string;
  conflictType: 'DIVERGED_BRANCH' | 'OUTDATED_AUDIT_SEQUENCE' | 'METADATA_MISMATCH';
  resolution: 'PULL_REQUIRED' | 'MANUAL_REVIEW';
}

export class CloudFederationService {
  constructor(
    private config: CloudFederationConfig,
    private deviceRepo: DeviceRepository,
    private projectRepo: ProjectRepository,
    private auditRepo: AuditLogRepository,
    private logger?: ProductionLogger
  ) {}

  /**
   * Generates a canonical, cryptographically signed metadata payload
   * for broadcasting to cloud federation or peer devices.
   * NOTE: Local filesystem paths are strictly stripped to prevent remote leakage.
   */
  async buildOutboundSyncPayload(privateKeyPem?: string): Promise<CrossDeviceSyncPayload> {
    const projects = this.projectRepo.listAll();
    const latestAudit = this.auditRepo.getLatestEntry();

    const metadataList: CrossDeviceSyncMetadata[] = projects.map((p) => ({
      projectId: p.id,
      name: p.name,
      gitRemoteUrl: p.gitRemoteUrl || undefined,
      latestAuditSequence: latestAudit?.sequenceNum ?? 0,
      updatedAt: p.updatedAt
    }));

    const timestamp = Date.now();
    const payloadToSign = JSON.stringify({
      sourceDeviceId: this.config.deviceId,
      timestamp,
      projects: metadataList
    });

    let signature = '';
    if (privateKeyPem) {
      const signer = crypto.createSign('SHA256');
      signer.update(payloadToSign);
      signer.end();
      signature = signer.sign(privateKeyPem, 'hex');
    } else {
      // HMAC fallback using deviceId and timestamp
      signature = crypto
        .createHmac('sha256', this.config.deviceId)
        .update(payloadToSign)
        .digest('hex');
    }

    return {
      sourceDeviceId: this.config.deviceId,
      timestamp,
      projects: metadataList,
      signature
    };
  }

  /**
   * Ingests an inbound payload from another registered device.
   * Verifies cryptographic signature, matches projects by gitRemoteUrl or name,
   * detects conflicts, and updates device sync state.
   */
  async processInboundSyncPayload(
    payload: CrossDeviceSyncPayload
  ): Promise<{
    success: boolean;
    conflicts: SyncConflictReport[];
    synchronizedProjectsCount: number;
  }> {
    const sourceDevice = this.deviceRepo.getById(payload.sourceDeviceId);
    if (!sourceDevice) {
      throw new Error(`Inbound payload rejected: Device '${payload.sourceDeviceId}' is not registered.`);
    }

    if (sourceDevice.status !== 'ACTIVE') {
      throw new Error(`Inbound payload rejected: Device '${sourceDevice.name}' is revoked or offline.`);
    }

    // Verify signature
    const isValid = this.verifySignature(sourceDevice, payload);
    if (!isValid) {
      throw new Error('Inbound payload signature verification failed. Possible payload tampering.');
    }

    const conflicts: SyncConflictReport[] = [];
    let syncedCount = 0;

    for (const remoteProj of payload.projects) {
      // Find matching local project by gitRemoteUrl or name
      const localProjects = this.projectRepo.listAll();
      const matchedLocal = localProjects.find(
        (lp) =>
          (lp.gitRemoteUrl && lp.gitRemoteUrl === remoteProj.gitRemoteUrl) ||
          lp.name.toLowerCase() === remoteProj.name.toLowerCase()
      );

      if (matchedLocal) {
        // Record device sync progress
        this.deviceRepo.recordProjectSync({
          deviceId: sourceDevice.id,
          projectId: matchedLocal.id,
          lastSyncedAuditSeq: remoteProj.latestAuditSequence || 0,
          lastSyncedHeadSha: remoteProj.lastHeadSha
        });

        // Check for potential divergence
        const localAudit = this.auditRepo.getLatestEntry();
        if (
          remoteProj.latestAuditSequence &&
          localAudit?.sequenceNum &&
          remoteProj.latestAuditSequence > localAudit.sequenceNum
        ) {
          conflicts.push({
            projectId: matchedLocal.id,
            projectName: matchedLocal.name,
            localHeadSha: undefined,
            remoteDeviceHeadSha: remoteProj.lastHeadSha,
            conflictType: 'OUTDATED_AUDIT_SEQUENCE',
            resolution: 'PULL_REQUIRED'
          });
        }

        syncedCount++;
      }
    }

    this.deviceRepo.touchLastSeen(sourceDevice.id);
    this.logger?.info(
      'CloudFederation',
      `Synchronized with device '${sourceDevice.name}': ${syncedCount} projects, ${conflicts.length} conflicts`
    );

    return {
      success: true,
      conflicts,
      synchronizedProjectsCount: syncedCount
    };
  }

  private verifySignature(device: Device, payload: CrossDeviceSyncPayload): boolean {
    const payloadString = JSON.stringify({
      sourceDeviceId: payload.sourceDeviceId,
      timestamp: payload.timestamp,
      projects: payload.projects
    });

    try {
      if (device.publicKey.includes('PUBLIC KEY')) {
        const verifier = crypto.createVerify('SHA256');
        verifier.update(payloadString);
        verifier.end();
        return verifier.verify(device.publicKey, payload.signature, 'hex');
      }

      // HMAC verification fallback
      const expected = crypto
        .createHmac('sha256', device.id)
        .update(payloadString)
        .digest('hex');
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(payload.signature));
    } catch {
      return false;
    }
  }
}
