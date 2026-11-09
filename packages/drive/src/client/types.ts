export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  md5Checksum?: string;
  createdTime?: string;
  parents?: string[];
}

export interface DriveFolderHierarchy {
  rootFolderId: string;
  projectFolderId: string;
  snapshotsFolderId: string;
  docsFolderId: string;
  releasesFolderId: string;
}

export interface DriveUploadResult {
  fileId: string;
  name: string;
  sizeBytes: number;
  md5Checksum?: string;
  webViewLink?: string;
}
