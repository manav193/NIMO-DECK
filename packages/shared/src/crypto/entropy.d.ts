/**
 * Calculates the Shannon entropy of a given string in bits per character.
 * Strings with high entropy (e.g., > 4.5) and significant length (e.g., > 24)
 * frequently indicate random cryptographic keys, tokens, or hashes.
 */
export declare function calculateShannonEntropy(str: string): number;
/**
 * Common high-confidence secret regex signatures.
 */
export declare const SECRET_SIGNATURE_PATTERNS: RegExp[];
/**
 * Evaluates whether a given text snippet or token represents a probable secret.
 */
export declare function isProbableSecret(content: string, minEntropy?: number, minTokenLength?: number): boolean;
//# sourceMappingURL=entropy.d.ts.map