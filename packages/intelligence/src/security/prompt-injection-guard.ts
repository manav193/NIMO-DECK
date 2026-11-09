export class PromptInjectionGuard {
  private static readonly INJECTION_PATTERNS = [
    /(?:ignore|disregard|forget)\s+(?:all\s+)?(?:prior|previous|above)\s+(?:instructions|prompts|rules)/i,
    /(?:system\s*prompt|system\s*message|developer\s*mode|god\s*mode)\s*(?:override|bypass|reset)/i,
    /<\|im_start\|>|<\|im_end\|>|<\|endoftext\|>/i,
    /<\/?[a-zA-Z0-9_-]*(?:system|instructions|prompt)[a-zA-Z0-9_-]*>/i,
    /(?:you are now|act as|pretend to be)\s+(?:an unrestricted|a malicious|DAN)/i
  ];

  /**
   * Neutralizes prompt injection patterns by escaping or annotating them,
   * preventing them from altering model execution instructions.
   */
  static sanitize(text: string): { sanitized: string; neutralizedPatterns: number } {
    let sanitized = text;
    let count = 0;

    for (const pattern of PromptInjectionGuard.INJECTION_PATTERNS) {
      if (pattern.test(sanitized)) {
        sanitized = sanitized.replace(pattern, (match) => {
          count++;
          const safeMatch = match.replace(/<|>/g, '_').replace(/["\\]/g, '');
          return `[SUSPICIOUS_PROMPT_INJECTION_NEUTRALIZED: "${safeMatch}"]`;
        });
      }
    }

    return { sanitized, neutralizedPatterns: count };
  }

  /**
   * Wraps untrusted codebase content in unambiguous delimiters with system guardrails.
   */
  static wrapUntrusted(sourceLabel: string, content: string): string {
    const { sanitized } = this.sanitize(content);
    return `<<<START_UNTRUSTED_CODEBASE_CONTENT: ${sourceLabel}>>>\n${sanitized}\n<<<END_UNTRUSTED_CODEBASE_CONTENT: ${sourceLabel}>>>`;
  }
}
