export type QuarantineReason =
  | 'IMMUTABLE_IGNORE'
  | 'HIGH_ENTROPY_SECRET'
  | 'SECRET_SIGNATURE'
  | 'FILE_TOO_LARGE';

export interface QuarantinedFile {
  path: string;
  reason: QuarantineReason;
  details: string;
}

export interface ScanResult {
  isSafe: boolean;
  safeFiles: string[];
  quarantinedFiles: QuarantinedFile[];
}
