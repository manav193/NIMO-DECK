"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDefaultDatabasePath = getDefaultDatabasePath;
exports.createDatabaseConnection = createDatabaseConnection;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const better_sqlite3_2 = require("drizzle-orm/better-sqlite3");
const schema = __importStar(require("./schema.js"));
const migrator_js_1 = require("./migrator.js");
const node_path_1 = __importDefault(require("node:path"));
const node_os_1 = __importDefault(require("node:os"));
const node_fs_1 = __importDefault(require("node:fs"));
/**
 * Returns the default system SQLite database path (~/.nimo-deck/nimo-deck.sqlite).
 */
function getDefaultDatabasePath() {
    const homeDir = node_os_1.default.homedir();
    const deckDir = node_path_1.default.join(homeDir, '.nimo-deck');
    if (!node_fs_1.default.existsSync(deckDir)) {
        node_fs_1.default.mkdirSync(deckDir, { recursive: true });
    }
    return node_path_1.default.join(deckDir, 'nimo-deck.sqlite');
}
/**
 * Creates and initializes an embedded SQLite database connection for NIMO-DECK.
 */
function createDatabaseConnection(config = {}) {
    const targetPath = config.inMemory ? ':memory:' : (config.filePath || getDefaultDatabasePath());
    const sqlite = new better_sqlite3_1.default(targetPath, {
        verbose: config.verbose ? console.log : undefined
    });
    // Optimize SQLite performance and safety pragmas
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');
    sqlite.pragma('busy_timeout = 5000');
    sqlite.pragma('synchronous = NORMAL');
    const db = (0, better_sqlite3_2.drizzle)(sqlite, { schema });
    if (config.autoMigrate !== false) {
        (0, migrator_js_1.runMigrations)(sqlite);
    }
    return { db, sqlite };
}
//# sourceMappingURL=connection.js.map