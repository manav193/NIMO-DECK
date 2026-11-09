import { z } from 'zod';

export const ProjectStatusSchema = z.enum(['ACTIVE', 'PAUSED', 'ERROR']);
export type ProjectStatus = z.infer<typeof ProjectStatusSchema>;

export const ProjectSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  localPath: z.string().min(1),
  gitRemoteUrl: z.string().url().nullable().optional(),
  status: ProjectStatusSchema.default('ACTIVE'),
  createdAt: z.date(),
  updatedAt: z.date()
});
export type Project = z.infer<typeof ProjectSchema>;

export const CreateProjectInputSchema = z.object({
  name: z.string().min(1).max(255),
  localPath: z.string().min(1),
  gitRemoteUrl: z.string().url().optional()
});
export type CreateProjectInput = z.infer<typeof CreateProjectInputSchema>;

export const UpdateProjectInputSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  gitRemoteUrl: z.string().url().nullable().optional(),
  status: ProjectStatusSchema.optional()
});
export type UpdateProjectInput = z.infer<typeof UpdateProjectInputSchema>;
