import { z } from 'zod';
export declare const ProjectStatusSchema: z.ZodEnum<["ACTIVE", "PAUSED", "ERROR"]>;
export type ProjectStatus = z.infer<typeof ProjectStatusSchema>;
export declare const ProjectSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    localPath: z.ZodString;
    gitRemoteUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    status: z.ZodDefault<z.ZodEnum<["ACTIVE", "PAUSED", "ERROR"]>>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    localPath: string;
    status: "ACTIVE" | "PAUSED" | "ERROR";
    createdAt: Date;
    updatedAt: Date;
    gitRemoteUrl?: string | null | undefined;
}, {
    id: string;
    name: string;
    localPath: string;
    createdAt: Date;
    updatedAt: Date;
    gitRemoteUrl?: string | null | undefined;
    status?: "ACTIVE" | "PAUSED" | "ERROR" | undefined;
}>;
export type Project = z.infer<typeof ProjectSchema>;
export declare const CreateProjectInputSchema: z.ZodObject<{
    name: z.ZodString;
    localPath: z.ZodString;
    gitRemoteUrl: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    localPath: string;
    gitRemoteUrl?: string | undefined;
}, {
    name: string;
    localPath: string;
    gitRemoteUrl?: string | undefined;
}>;
export type CreateProjectInput = z.infer<typeof CreateProjectInputSchema>;
export declare const UpdateProjectInputSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    gitRemoteUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    status: z.ZodOptional<z.ZodEnum<["ACTIVE", "PAUSED", "ERROR"]>>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    gitRemoteUrl?: string | null | undefined;
    status?: "ACTIVE" | "PAUSED" | "ERROR" | undefined;
}, {
    name?: string | undefined;
    gitRemoteUrl?: string | null | undefined;
    status?: "ACTIVE" | "PAUSED" | "ERROR" | undefined;
}>;
export type UpdateProjectInput = z.infer<typeof UpdateProjectInputSchema>;
//# sourceMappingURL=project.d.ts.map