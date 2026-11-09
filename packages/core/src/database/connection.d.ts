import Database from 'better-sqlite3';
import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';
export type DeckDatabase = BetterSQLite3Database<typeof schema>;
export interface DatabaseConfig {
    filePath?: string;
    inMemory?: boolean;
    verbose?: boolean;
    autoMigrate?: boolean;
}
/**
 * Returns the default system SQLite database path (~/.nimo-deck/nimo-deck.sqlite).
 */
export declare function getDefaultDatabasePath(): string;
/**
 * Creates and initializes an embedded SQLite database connection for NIMO-DECK.
 */
export declare function createDatabaseConnection(config?: DatabaseConfig): {
    db: DeckDatabase;
    sqlite: Database.Database;
};
//# sourceMappingURL=connection.d.ts.map