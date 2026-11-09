import { z } from 'zod';
export declare const AuditActorSchema: z.ZodEnum<["SYSTEM", "USER", "AI_AGENT"]>;
export type AuditActor = z.infer<typeof AuditActorSchema>;
export declare const AuditLogEntrySchema: z.ZodObject<{
    id: z.ZodString;
    projectId: z.ZodNullable<z.ZodString>;
    actor: z.ZodEnum<["SYSTEM", "USER", "AI_AGENT"]>;
    action: z.ZodString;
    payloadHash: z.ZodString;
    prevLogHash: z.ZodString;
    entryHash: z.ZodString;
    createdAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: Date;
    projectId: string | null;
    actor: "SYSTEM" | "USER" | "AI_AGENT";
    action: string;
    payloadHash: string;
    prevLogHash: string;
    entryHash: string;
}, {
    id: string;
    createdAt: Date;
    projectId: string | null;
    actor: "SYSTEM" | "USER" | "AI_AGENT";
    action: string;
    payloadHash: string;
    prevLogHash: string;
    entryHash: string;
}>;
export type AuditLogEntry = z.infer<typeof AuditLogEntrySchema>;
export declare const VaultSnapshotSchema: z.ZodObject<{
    id: z.ZodString;
    projectId: z.ZodString;
    commitSha: z.ZodOptional<z.ZodString>;
    patchData: z.ZodString;
    description: z.ZodString;
    createdAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: Date;
    projectId: string;
    patchData: string;
    description: string;
    commitSha?: string | undefined;
}, {
    id: string;
    createdAt: Date;
    projectId: string;
    patchData: string;
    description: string;
    commitSha?: string | undefined;
}>;
export type VaultSnapshot = z.infer<typeof VaultSnapshotSchema>;
//# sourceMappingURL=vault.d.ts.map