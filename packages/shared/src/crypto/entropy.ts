/**
 * Calculates the Shannon entropy of a given string in bits per character.
 * Strings with high entropy (e.g., > 4.5) and significant length (e.g., > 24)
 * frequently indicate random cryptographic keys, tokens, or hashes.
 */
export function calculateShannonEntropy(str: string): number {
  if (!str || str.length === 0) {
    return 0;
  }

  const charFrequencies: Record<string, number> = {};
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    charFrequencies[char] = (charFrequencies[char] || 0) + 1;
  }

  let entropy = 0;
  const len = str.length;
  for (const char in charFrequencies) {
    const p = charFrequencies[char] / len;
    entropy -= p * Math.log2(p);
  }

  return entropy;
}

/**
 * Common high-confidence secret regex signatures.
 */
export const SECRET_SIGNATURE_PATTERNS: RegExp[] = [
  // Private keys
  /-----BEGIN\s+(?:RSA|EC|DSA|OPENSSH|PGP)?\s*PRIVATE KEY-----/,
  // GitHub PATs
  /ghp_[A-Za-z0-9]{36}/,
  /github_pat_[A-Za-z0-9_]{82}/,
  // AWS Access Key ID
  /AKIA[0-9A-Z]{16}/,
  // OpenAI & OpenRouter API Keys
  /sk-[A-Za-z0-9]{48}/,
  /sk-or-v1-[a-f0-9]{64}/,
  // Generic Bearer tokens / JWTs
  /eyJ[A-Za-z0-9-_]+\.eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/
];

/**
 * Evaluates whether a given text snippet or token represents a probable secret.
 */
export function isProbableSecret(
  content: string,
  minEntropy = 4.5,
  minTokenLength = 24
): boolean {
  if (!content) return false;

  // 1. Direct signature pattern match
  if (SECRET_SIGNATURE_PATTERNS.some((pattern) => pattern.test(content))) {
    return true;
  }

  // 2. Tokenize by whitespace, quotes, and commas to inspect individual tokens
  const tokens = content.split(/[\s"',:;=()[\]{}]+/);
  for (const token of tokens) {
    if (token.length >= minTokenLength) {
      const entropy = calculateShannonEntropy(token);
      if (entropy >= minEntropy) {
        return true;
      }
    }
  }

  return false;
}
