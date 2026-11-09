/**
 * Immutable ignore patterns that are unconditionally excluded from
 * staging, committing, or uploading in NIMO-DECK.
 */
export declare const IMMUTABLE_IGNORED_PATTERNS: RegExp[];
/**
 * Checks whether a given relative or absolute path matches any of the
 * immutable ignore rules.
 */
export declare function isImmutableIgnored(filePath: string): boolean;
//# sourceMappingURL=ignore-patterns.d.ts.map