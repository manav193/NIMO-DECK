import type { DeckDatabase } from '../database/connection.js';
import type { Project, CreateProjectInput, UpdateProjectInput } from '@nimo-deck/shared';
export declare class ProjectRepository {
    private db;
    constructor(db: DeckDatabase);
    create(input: CreateProjectInput): Project;
    getById(id: string): Project | null;
    getByPath(localPath: string): Project | null;
    listAll(): Project[];
    update(id: string, input: UpdateProjectInput): Project | null;
    delete(id: string): boolean;
}
//# sourceMappingURL=project-repository.d.ts.map