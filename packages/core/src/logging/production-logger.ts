import fs from 'node:fs';
import path from 'node:path';

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  details?: unknown;
}

export interface LoggerConfig {
  logDir?: string;
  filename?: string;
  maxSizeBytes?: number;
  maxFiles?: number;
  minLevel?: LogLevel;
  consoleOutput?: boolean;
}

const LEVEL_SEVERITY: Record<LogLevel, number> = {
  DEBUG: 10,
  INFO: 20,
  WARN: 30,
  ERROR: 40
};

// Patterns for sensitive data redaction
const SENSITIVE_PATTERNS = [
  /ghp_[a-zA-Z0-9]{36}/g,
  /github_pat_[a-zA-Z0-9_]{82}/g,
  /sk-[a-zA-Z0-9]{48}/g,
  /AIza[0-9A-Za-z-_]{35}/g,
  /Bearer\s+([A-Za-z0-9\-._~+/]+=*)/gi,
  /"(client_secret|apiKey|secret|privateKey|password)":\s*"[^"]+"/gi
];

export class ProductionLogger {
  private logDir: string;
  private currentFilePath: string;
  private maxSizeBytes: number;
  private maxFiles: number;
  private minLevel: LogLevel;
  private consoleOutput: boolean;
  private ringBuffer: LogEntry[] = [];
  private ringBufferSize = 200;

  constructor(config: LoggerConfig = {}) {
    this.logDir = config.logDir || path.join(process.cwd(), 'logs');
    this.currentFilePath = path.join(this.logDir, config.filename || 'nimo-deck.log');
    this.maxSizeBytes = config.maxSizeBytes || 10 * 1024 * 1024; // 10MB
    this.maxFiles = config.maxFiles || 5;
    this.minLevel = config.minLevel || 'INFO';
    this.consoleOutput = config.consoleOutput ?? true;

    if (!fs.existsSync(this.logDir)) {
      try {
        fs.mkdirSync(this.logDir, { recursive: true });
      } catch {
        // Fallback to process cwd or temp if logDir creation fails
      }
    }
  }

  debug(module: string, message: string, details?: unknown) {
    this.log('DEBUG', module, message, details);
  }

  info(module: string, message: string, details?: unknown) {
    this.log('INFO', module, message, details);
  }

  warn(module: string, message: string, details?: unknown) {
    this.log('WARN', module, message, details);
  }

  error(module: string, message: string, details?: unknown) {
    this.log('ERROR', module, message, details);
  }

  getRecentLogs(limit = 100): LogEntry[] {
    return this.ringBuffer.slice(-limit);
  }

  private log(level: LogLevel, module: string, rawMessage: string, details?: unknown) {
    if (LEVEL_SEVERITY[level] < LEVEL_SEVERITY[this.minLevel]) {
      return;
    }

    const message = this.redact(rawMessage);
    const sanitizedDetails = details ? this.sanitizeDetails(details) : undefined;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      module,
      message,
      ...(sanitizedDetails ? { details: sanitizedDetails } : {})
    };

    // Keep in ring buffer
    this.ringBuffer.push(entry);
    if (this.ringBuffer.length > this.ringBufferSize) {
      this.ringBuffer.shift();
    }

    const line = JSON.stringify(entry) + '\n';

    if (this.consoleOutput) {
      if (level === 'ERROR') {
        process.stderr.write(`[${entry.timestamp}] [${level}] [${module}] ${message}\n`);
      } else {
        process.stdout.write(`[${entry.timestamp}] [${level}] [${module}] ${message}\n`);
      }
    }

    this.writeWithRotation(line);
  }

  private writeWithRotation(line: string) {
    try {
      if (fs.existsSync(this.currentFilePath)) {
        const stats = fs.statSync(this.currentFilePath);
        if (stats.size >= this.maxSizeBytes) {
          this.rotateFiles();
        }
      }

      fs.appendFileSync(this.currentFilePath, line, 'utf8');
    } catch {
      // Avoid throwing from logging layer
    }
  }

  private rotateFiles() {
    for (let i = this.maxFiles - 1; i >= 1; i--) {
      const src = `${this.currentFilePath}.${i}`;
      const dest = `${this.currentFilePath}.${i + 1}`;
      if (fs.existsSync(src)) {
        if (i + 1 > this.maxFiles) {
          fs.unlinkSync(src);
        } else {
          fs.renameSync(src, dest);
        }
      }
    }

    const firstBackup = `${this.currentFilePath}.1`;
    if (fs.existsSync(this.currentFilePath)) {
      fs.renameSync(this.currentFilePath, firstBackup);
    }
  }

  private redact(str: string): string {
    let result = str;
    for (const pattern of SENSITIVE_PATTERNS) {
      result = result.replace(pattern, '[REDACTED]');
    }
    return result;
  }

  private sanitizeDetails(data: unknown): unknown {
    try {
      const json = JSON.stringify(data);
      const redacted = this.redact(json);
      return JSON.parse(redacted);
    } catch {
      return '[Unserializable]';
    }
  }
}
