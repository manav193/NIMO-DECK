"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectRepository = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const schema_js_1 = require("../database/schema.js");
const node_crypto_1 = __importDefault(require("node:crypto"));
class ProjectRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    create(input) {
        const id = node_crypto_1.default.randomUUID();
        const now = new Date();
        const newProject = {
            id,
            name: input.name,
            localPath: input.localPath,
            gitRemoteUrl: input.gitRemoteUrl || null,
            status: 'ACTIVE',
            createdAt: now,
            updatedAt: now
        };
        this.db.insert(schema_js_1.projects).values(newProject).run();
        // Initialize default sync config for project
        this.db
            .insert(schema_js_1.syncConfigs)
            .values({
            projectId: id,
            autoCommitEnabled: true,
            debounceWindowMs: 5000,
            maxWaitMs: 30000,
            autoPushMode: 'ON_COMMIT',
            pushIntervalSec: 300,
            aiCommitMessages: false,
            dryRunMode: false,
            updatedAt: now
        })
            .run();
        return {
            id,
            name: input.name,
            localPath: input.localPath,
            gitRemoteUrl: input.gitRemoteUrl,
            status: 'ACTIVE',
            createdAt: now,
            updatedAt: now
        };
    }
    getById(id) {
        const row = this.db.select().from(schema_js_1.projects).where((0, drizzle_orm_1.eq)(schema_js_1.projects.id, id)).get();
        if (!row)
            return null;
        return {
            id: row.id,
            name: row.name,
            localPath: row.localPath,
            gitRemoteUrl: row.gitRemoteUrl,
            status: row.status,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt
        };
    }
    getByPath(localPath) {
        const row = this.db.select().from(schema_js_1.projects).where((0, drizzle_orm_1.eq)(schema_js_1.projects.localPath, localPath)).get();
        if (!row)
            return null;
        return {
            id: row.id,
            name: row.name,
            localPath: row.localPath,
            gitRemoteUrl: row.gitRemoteUrl,
            status: row.status,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt
        };
    }
    listAll() {
        const rows = this.db.select().from(schema_js_1.projects).all();
        return rows.map((row) => ({
            id: row.id,
            name: row.name,
            localPath: row.localPath,
            gitRemoteUrl: row.gitRemoteUrl,
            status: row.status,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt
        }));
    }
    update(id, input) {
        const now = new Date();
        const updateValues = {
            updatedAt: now
        };
        if (input.name !== undefined)
            updateValues.name = input.name;
        if (input.gitRemoteUrl !== undefined)
            updateValues.gitRemoteUrl = input.gitRemoteUrl;
        if (input.status !== undefined)
            updateValues.status = input.status;
        this.db.update(schema_js_1.projects).set(updateValues).where((0, drizzle_orm_1.eq)(schema_js_1.projects.id, id)).run();
        return this.getById(id);
    }
    delete(id) {
        const result = this.db.delete(schema_js_1.projects).where((0, drizzle_orm_1.eq)(schema_js_1.projects.id, id)).run();
        return result.changes > 0;
    }
}
exports.ProjectRepository = ProjectRepository;
//# sourceMappingURL=project-repository.js.map