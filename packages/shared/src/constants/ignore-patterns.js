"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IMMUTABLE_IGNORED_PATTERNS = void 0;
exports.isImmutableIgnored = isImmutableIgnored;
/**
 * Immutable ignore patterns that are unconditionally excluded from
 * staging, committing, or uploading in NIMO-DECK.
 */
exports.IMMUTABLE_IGNORED_PATTERNS = [
    // Version control internals
    /(?:^|[/\\])\.git(?:$|[/\\])/,
    /(?:^|[/\\])\.hg(?:$|[/\\])/,
    /(?:^|[/\\])\.svn(?:$|[/\\])/,
    // Package dependencies & virtual environments
    /(?:^|[/\\])node_modules(?:$|[/\\])/,
    /(?:^|[/\\])\.pnpm-store(?:$|[/\\])/,
    /(?:^|[/\\])\.venv(?:$|[/\\])/,
    /(?:^|[/\\])venv(?:$|[/\\])/,
    /(?:^|[/\\])vendor(?:$|[/\\])/,
    /(?:^|[/\\])__pycache__(?:$|[/\\])/,
    // Build outputs & caches
    /(?:^|[/\\])dist(?:$|[/\\])/,
    /(?:^|[/\\])build(?:$|[/\\])/,
    /(?:^|[/\\])\.next(?:$|[/\\])/,
    /(?:^|[/\\])\.nuxt(?:$|[/\\])/,
    /(?:^|[/\\])target(?:$|[/\\])/,
    /(?:^|[/\\])bin(?:$|[/\\])/,
    /(?:^|[/\\])obj(?:$|[/\\])/,
    /(?:^|[/\\])\.turbo(?:$|[/\\])/,
    /(?:^|[/\\])\.cache(?:$|[/\\])/,
    // Environment and credential files
    /(?:^|[/\\])\.env(?:\..*)?$/,
    /\.pem$/,
    /\.key$/,
    /\.pkcs12$/,
    /\.pfx$/,
    /(?:^|[/\\])id_rsa(?:\..*)?$/,
    /(?:^|[/\\])id_ed25519(?:\..*)?$/,
    // OS artifacts
    /(?:^|[/\\])Thumbs\.db$/,
    /(?:^|[/\\])\.DS_Store$/,
    /(?:^|[/\\])desktop\.ini$/
];
/**
 * Checks whether a given relative or absolute path matches any of the
 * immutable ignore rules.
 */
function isImmutableIgnored(filePath) {
    return exports.IMMUTABLE_IGNORED_PATTERNS.some((pattern) => pattern.test(filePath));
}
//# sourceMappingURL=ignore-patterns.js.map