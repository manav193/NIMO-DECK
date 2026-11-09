import EventEmitter from 'eventemitter3';
import type { Project, SyncEvent, CommitRecord, DriveBackup, AIAnalysis } from '@nimo-deck/shared';
export interface DeckEventMap {
    'project:created': (project: Project) => void;
    'project:updated': (project: Project) => void;
    'project:deleted': (projectId: string) => void;
    'sync:event_logged': (event: SyncEvent) => void;
    'sync:commit_created': (commit: CommitRecord) => void;
    'sync:conflict_detected': (data: {
        projectId: string;
        branch: string;
        reason: string;
    }) => void;
    'sync:push_succeeded': (data: {
        projectId: string;
        branch: string;
        sha: string;
    }) => void;
    'sync:push_failed': (data: {
        projectId: string;
        branch: string;
        error: string;
    }) => void;
    'drive:backup_created': (backup: DriveBackup) => void;
    'ai:analysis_completed': (analysis: AIAnalysis) => void;
    'security:secret_blocked': (data: {
        projectId: string;
        filePath: string;
        reason: string;
    }) => void;
}
export declare class DeckEventBus extends EventEmitter<DeckEventMap> {
    private static instance;
    static getInstance(): DeckEventBus;
}
//# sourceMappingURL=event-bus.d.ts.map