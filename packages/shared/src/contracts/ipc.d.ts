import { z } from 'zod';
export declare const IPCRequestSchema: z.ZodObject<{
    id: z.ZodString;
    channel: z.ZodString;
    payload: z.ZodUnknown;
    timestamp: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    id: string;
    timestamp: number;
    channel: string;
    payload?: unknown;
}, {
    id: string;
    timestamp: number;
    channel: string;
    payload?: unknown;
}>;
export type IPCRequest<T = unknown> = {
    id: string;
    channel: string;
    payload: T;
    timestamp: number;
};
export declare const IPCErrorSchema: z.ZodObject<{
    code: z.ZodString;
    message: z.ZodString;
    details: z.ZodOptional<z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    message: string;
    code: string;
    details?: unknown;
}, {
    message: string;
    code: string;
    details?: unknown;
}>;
export type IPCError = z.infer<typeof IPCErrorSchema>;
export declare const IPCResponseSchema: z.ZodObject<{
    id: z.ZodString;
    success: z.ZodBoolean;
    data: z.ZodOptional<z.ZodUnknown>;
    error: z.ZodOptional<z.ZodObject<{
        code: z.ZodString;
        message: z.ZodString;
        details: z.ZodOptional<z.ZodUnknown>;
    }, "strip", z.ZodTypeAny, {
        message: string;
        code: string;
        details?: unknown;
    }, {
        message: string;
        code: string;
        details?: unknown;
    }>>;
    durationMs: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    id: string;
    success: boolean;
    durationMs: number;
    data?: unknown;
    error?: {
        message: string;
        code: string;
        details?: unknown;
    } | undefined;
}, {
    id: string;
    success: boolean;
    durationMs: number;
    data?: unknown;
    error?: {
        message: string;
        code: string;
        details?: unknown;
    } | undefined;
}>;
export type IPCResponse<T = unknown> = {
    id: string;
    success: boolean;
    data?: T;
    error?: IPCError;
    durationMs: number;
};
export declare const IPCChannels: {
    readonly PROJECT_LIST: "project:list";
    readonly PROJECT_GET: "project:get";
    readonly PROJECT_CREATE: "project:create";
    readonly PROJECT_UPDATE: "project:update";
    readonly PROJECT_DELETE: "project:delete";
    readonly SYNC_TRIGGER_COMMIT: "sync:triggerCommit";
    readonly SYNC_TRIGGER_PUSH: "sync:triggerPush";
    readonly SYNC_TRIGGER_PULL: "sync:triggerPull";
    readonly SYNC_GET_CONFIG: "sync:getConfig";
    readonly SYNC_UPDATE_CONFIG: "sync:updateConfig";
    readonly SYNC_GET_STATUS: "sync:getStatus";
    readonly DRIVE_CREATE_SNAPSHOT: "drive:createSnapshot";
    readonly DRIVE_LIST_BACKUPS: "drive:listBackups";
    readonly DRIVE_RESTORE: "drive:restore";
    readonly AI_ANALYZE_REPO: "ai:analyzeRepo";
    readonly AI_GET_RECOMMENDATIONS: "ai:getRecommendations";
    readonly AI_UPDATE_RECOMMENDATION: "ai:updateRecommendation";
    readonly AI_GET_ROADMAP: "ai:getRoadmap";
    readonly VAULT_LIST_AUDIT_LOGS: "vault:listAuditLogs";
    readonly VAULT_VERIFY_CHAIN: "vault:verifyChain";
    readonly EVENT_SYNC_STATE_CHANGED: "event:syncStateChanged";
    readonly EVENT_ALERT_RAISED: "event:alertRaised";
};
export type IPCChannelName = typeof IPCChannels[keyof typeof IPCChannels];
//# sourceMappingURL=ipc.d.ts.map