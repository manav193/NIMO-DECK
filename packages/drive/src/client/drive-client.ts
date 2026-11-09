import type { GoogleOAuthHandler } from '../auth/oauth-handler.js';
import type { DriveFile, DriveFolderHierarchy, DriveUploadResult } from './types.js';

export interface DriveClientOptions {
  oauthHandler: GoogleOAuthHandler;
  fetcher?: typeof fetch;
  apiBaseUrl?: string;
  uploadBaseUrl?: string;
}

export class GoogleDriveClient {
  private oauth: GoogleOAuthHandler;
  private fetcher: typeof fetch;
  private apiBaseUrl: string;
  private uploadBaseUrl: string;

  constructor(options: DriveClientOptions) {
    this.oauth = options.oauthHandler;
    this.fetcher = options.fetcher ?? fetch;
    this.apiBaseUrl = options.apiBaseUrl ?? 'https://www.googleapis.com/drive/v3';
    this.uploadBaseUrl = options.uploadBaseUrl ?? 'https://www.googleapis.com/upload/drive/v3';
  }

  private async getAuthHeader(): Promise<string> {
    const token = await this.oauth.getValidAccessToken();
    return `Bearer ${token}`;
  }

  /**
   * Discovers or creates a folder with the specified name under an optional parent folder.
   */
  async ensureFolder(folderName: string, parentId?: string): Promise<string> {
    const auth = await this.getAuthHeader();
    let query = `mimeType = 'application/vnd.google-apps.folder' and name = '${folderName}' and trashed = false`;
    if (parentId) {
      query += ` and '${parentId}' in parents`;
    }

    const searchUrl = `${this.apiBaseUrl}/files?q=${encodeURIComponent(query)}&fields=files(id,name)`;
    const searchRes = await this.fetcher(searchUrl, {
      headers: { Authorization: auth }
    });

    if (searchRes.ok) {
      const data = (await searchRes.json()) as { files?: { id: string; name: string }[] };
      if (data.files && data.files.length > 0) {
        return data.files[0].id;
      }
    }

    // Create folder
    const createUrl = `${this.apiBaseUrl}/files`;
    const metadata: { name: string; mimeType: string; parents?: string[] } = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder'
    };
    if (parentId) {
      metadata.parents = [parentId];
    }

    const createRes = await this.fetcher(createUrl, {
      method: 'POST',
      headers: {
        Authorization: auth,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(metadata)
    });

    if (!createRes.ok) {
      throw new Error(`[Google Drive] Failed to create folder "${folderName}": ${createRes.status}`);
    }

    const created = (await createRes.json()) as { id: string };
    return created.id;
  }

  /**
   * Sets up the standard NIMO-DECK folder hierarchy for a project:
   * NIMO-DECK / <projectName> / {snapshots, docs, releases}
   */
  async ensureProjectStructure(projectName: string): Promise<DriveFolderHierarchy> {
    const rootFolderId = await this.ensureFolder('NIMO-DECK');
    const projectFolderId = await this.ensureFolder(projectName, rootFolderId);

    const [snapshotsFolderId, docsFolderId, releasesFolderId] = await Promise.all([
      this.ensureFolder('snapshots', projectFolderId),
      this.ensureFolder('docs', projectFolderId),
      this.ensureFolder('releases', projectFolderId)
    ]);

    return {
      rootFolderId,
      projectFolderId,
      snapshotsFolderId,
      docsFolderId,
      releasesFolderId
    };
  }

  /**
   * Performs multipart upload of a file and its metadata to Google Drive.
   */
  async uploadFile(params: {
    name: string;
    content: Buffer | Uint8Array;
    mimeType: string;
    parentId: string;
  }): Promise<DriveUploadResult> {
    const auth = await this.getAuthHeader();
    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadata = {
      name: params.name,
      parents: [params.parentId]
    };

    const metadataPart = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}`;
    const mediaHeader = `${delimiter}Content-Type: ${params.mimeType}\r\n\r\n`;

    const bodyBuffer = Buffer.concat([
      Buffer.from(metadataPart, 'utf8'),
      Buffer.from(mediaHeader, 'utf8'),
      Buffer.from(params.content),
      Buffer.from(closeDelimiter, 'utf8')
    ]);

    const uploadUrl = `${this.uploadBaseUrl}/files?uploadType=multipart&fields=id,name,size,md5Checksum,webViewLink`;
    const res = await this.fetcher(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: auth,
        'Content-Type': `multipart/related; boundary=${boundary}`,
        'Content-Length': String(bodyBuffer.length)
      },
      body: bodyBuffer
    });

    if (!res.ok) {
      throw new Error(`[Google Drive] Upload failed with status ${res.status}: ${res.statusText}`);
    }

    const data = (await res.json()) as {
      id: string;
      name: string;
      size?: string;
      md5Checksum?: string;
      webViewLink?: string;
    };

    return {
      fileId: data.id,
      name: data.name,
      sizeBytes: data.size ? parseInt(data.size, 10) : params.content.length,
      md5Checksum: data.md5Checksum,
      webViewLink: data.webViewLink
    };
  }

  /**
   * Downloads a binary file from Google Drive.
   */
  async downloadFile(fileId: string): Promise<Buffer> {
    const auth = await this.getAuthHeader();
    const downloadUrl = `${this.apiBaseUrl}/files/${fileId}?alt=media`;

    const res = await this.fetcher(downloadUrl, {
      headers: { Authorization: auth }
    });

    if (!res.ok) {
      throw new Error(`[Google Drive] Download failed for file ${fileId} with status ${res.status}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Lists files in a specific folder.
   */
  async listFiles(parentId: string): Promise<DriveFile[]> {
    const auth = await this.getAuthHeader();
    const query = `'${parentId}' in parents and trashed = false`;
    const url = `${this.apiBaseUrl}/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,size,md5Checksum,createdTime)&orderBy=createdTime desc`;

    const res = await this.fetcher(url, {
      headers: { Authorization: auth }
    });

    if (!res.ok) {
      throw new Error(`[Google Drive] Failed to list files in folder ${parentId}: ${res.status}`);
    }

    const data = (await res.json()) as {
      files?: Array<{
        id: string;
        name: string;
        mimeType: string;
        size?: string;
        md5Checksum?: string;
        createdTime?: string;
      }>;
    };
    return (data.files || []).map((f) => ({
      id: f.id,
      name: f.name,
      mimeType: f.mimeType,
      size: f.size ? parseInt(f.size, 10) : undefined,
      md5Checksum: f.md5Checksum,
      createdTime: f.createdTime
    }));
  }
}
