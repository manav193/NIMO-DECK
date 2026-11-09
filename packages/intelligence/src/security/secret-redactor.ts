import { SECRET_SIGNATURE_PATTERNS, isProbableSecret } from '@nimo-deck/shared';

export class SecretRedactor {
  private static readonly REDACTION_LABEL = '[REDACTED_SECRET]';

  /**
   * Scans text line-by-line and redacts API keys, tokens, and probable secrets.
   */
  static redact(content: string): { sanitized: string; redactionCount: number } {
    let count = 0;
    const lines = content.split(/\r?\n/);
    const sanitizedLines: string[] = [];

    for (const line of lines) {
      let modified = line;

      // 1. Regex pattern redaction
      for (const rx of SECRET_SIGNATURE_PATTERNS) {
        if (rx.test(modified)) {
          modified = modified.replace(rx, () => {
            count++;
            return SecretRedactor.REDACTION_LABEL;
          });
        }
      }

      // 2. Entropy token redaction for suspicious key-value assignments
      const kvMatches = modified.matchAll(/([a-zA-Z0-9_-]*(?:KEY|SECRET|TOKEN|PASSWORD|AUTH)[a-zA-Z0-9_-]*\s*[:=]\s*["']?)([^"'\s]+)(["']?)/gi);
      for (const match of Array.from(kvMatches)) {
        const val = match[2];
        if (val && val !== SecretRedactor.REDACTION_LABEL && isProbableSecret(val)) {
          modified = modified.replace(match[0], `${match[1]}${SecretRedactor.REDACTION_LABEL}${match[3]}`);
          count++;
        }
      }

      sanitizedLines.push(modified);
    }

    return {
      sanitized: sanitizedLines.join('\n'),
      redactionCount: count
    };
  }
}
