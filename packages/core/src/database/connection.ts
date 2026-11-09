import Database from 'better-sqlite3';
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';
import { runMigrations } from './migrator.js';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';

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
export function getDefaultDatabasePath(): string {
  const homeDir = os.homedir();
  const deckDir = path.join(homeDir, '.nimo-deck');
  if (!fs.existsSync(deckDir)) {
    fs.mkdirSync(deckDir, { recursive: true });
  }
  return path.join(deckDir, 'nimo-deck.sqlite');
}

/**
 * Creates and initializes an embedded SQLite database connection for NIMO-DECK.
 */
export function createDatabaseConnection(config: DatabaseConfig = {}): {
  db: DeckDatabase;
  sqlite: Database.Database;
} {
  const targetPath = config.inMemory ? ':memory:' : (config.filePath || getDefaultDatabasePath());

  const sqlite = new Database(targetPath, {
    verbose: config.verbose ? console.log : undefined
  });

  // Optimize SQLite performance and safety pragmas
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  sqlite.pragma('busy_timeout = 5000');
  sqlite.pragma('synchronous = NORMAL');

  const db = drizzle(sqlite, { schema });

  if (config.autoMigrate !== false) {
    runMigrations(sqlite);
  }

  return { db, sqlite };
}
