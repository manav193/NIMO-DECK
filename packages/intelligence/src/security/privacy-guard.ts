import { SecretRedactor } from './secret-redactor.js';
import { PromptInjectionGuard } from './prompt-injection-guard.js';

export interface PrivacyPolicy {
  aiAnalysisEnabled: boolean;
  localOnly: boolean;
}

export class PrivacyGuard {
  /**
   * Asserts whether analysis is permitted for the given project policy and selected provider.
   */
  static assertAllowed(policy: PrivacyPolicy, providerId: string): void {
    if (!policy.aiAnalysisEnabled) {
      throw new Error(
        'AI analysis is disabled for this project (ai_analysis_enabled: false). Explicit opt-in required.'
      );
    }

    if (policy.localOnly && providerId !== 'ollama') {
      throw new Error(
        `Project policy enforces local-only AI analysis. Cloud provider '${providerId}' is prohibited.`
      );
    }
  }

  /**
   * Generates a preview of the exact sanitized text payload and estimated token budget
   * before external transmission.
   */
  static generateTransmissionPreview(
    rawPrompt: string,
    untrustedSections: Array<{ label: string; text: string }>
  ): {
    previewText: string;
    estimatedTokens: number;
    secretsRedacted: number;
    injectionsNeutralized: number;
  } {
    let totalSecrets = 0;
    let totalInjections = 0;

    let assembled = rawPrompt + '\n\n';

    for (const sec of untrustedSections) {
      const red = SecretRedactor.redact(sec.text);
      totalSecrets += red.redactionCount;

      const wrapped = PromptInjectionGuard.wrapUntrusted(sec.label, red.sanitized);
      assembled += wrapped + '\n\n';
    }

    const { sanitized, neutralizedPatterns } = PromptInjectionGuard.sanitize(assembled);
    totalInjections += neutralizedPatterns;

    const estimatedTokens = Math.ceil(sanitized.length / 4);

    return {
      previewText: sanitized,
      estimatedTokens,
      secretsRedacted: totalSecrets,
      injectionsNeutralized: totalInjections
    };
  }
}
