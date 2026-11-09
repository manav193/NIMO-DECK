import { z } from 'zod';

export const DeviceTypeSchema = z.enum([
  'DESKTOP_WINDOWS',
  'DESKTOP_MACOS',
  'DESKTOP_LINUX',
  'LAPTOP',
  'MOBILE',
  'CLOUD_RUN'
]);
export type DeviceType = z.infer<typeof DeviceTypeSchema>;

export const DeviceStatusSchema = z.enum([
  'ACTIVE',
  'OFFLINE',
  'REVOKED',
  'PENDING_PAIRING'
]);
export type DeviceStatus = z.infer<typeof DeviceStatusSchema>;

export const DeviceSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  fingerprint: z.string().length(64), // SHA-256 hardware/identity fingerprint
  deviceType: DeviceTypeSchema,
  status: DeviceStatusSchema,
  publicKey: z.string().min(32), // Ed25519 or ECDSA public key in PEM/Hex
  clientVersion: z.string().default('0.1.0'),
  ipAddress: z.string().optional(),
  lastSeenAt: z.coerce.date().optional(),
  createdAt: z.coerce.date()
});
export type Device = z.infer<typeof DeviceSchema>;

export const DevicePairingRequestSchema = z.object({
  pairingCode: z.string().min(6).max(12),
  deviceName: z.string().min(1),
  deviceType: DeviceTypeSchema,
  fingerprint: z.string().length(64),
  publicKey: z.string().min(32)
});
export type DevicePairingRequest = z.infer<typeof DevicePairingRequestSchema>;

export const DevicePairingResponseSchema = z.object({
  deviceId: z.string().uuid(),
  authToken: z.string().min(32),
  refreshToken: z.string().min(32),
  expiresInSeconds: z.number().int().positive(),
  clusterFederationUrl: z.string().url().optional()
});
export type DevicePairingResponse = z.infer<typeof DevicePairingResponseSchema>;

export const CrossDeviceSyncMetadataSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string(),
  gitRemoteUrl: z.string().nullable().optional(),
  lastHeadSha: z.string().optional(),
  latestAuditSequence: z.number().int().nonnegative().optional(),
  updatedAt: z.coerce.date()
});
export type CrossDeviceSyncMetadata = z.infer<typeof CrossDeviceSyncMetadataSchema>;

export const CrossDeviceSyncPayloadSchema = z.object({
  sourceDeviceId: z.string().uuid(),
  timestamp: z.number().int().positive(),
  projects: z.array(CrossDeviceSyncMetadataSchema),
  signature: z.string().min(16) // Cryptographic signature over canonical JSON
});
export type CrossDeviceSyncPayload = z.infer<typeof CrossDeviceSyncPayloadSchema>;
