"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sha256 = sha256;
exports.hashPayload = hashPayload;
exports.computeAuditChainHash = computeAuditChainHash;
const node_crypto_1 = require("node:crypto");
/**
 * Computes the SHA-256 hex digest of a string or Buffer.
 */
function sha256(data) {
    return (0, node_crypto_1.createHash)('sha256').update(data).digest('hex');
}
/**
 * Deterministically computes the SHA-256 hash of an arbitrary JSON-serializable object.
 */
function hashPayload(payload) {
    const json = JSON.stringify(payload, Object.keys(payload || {}).sort());
    return sha256(json);
}
/**
 * Computes a cryptographic hash chain entry for tamper-evident audit logging.
 */
function computeAuditChainHash(params) {
    const data = `${params.prevLogHash}:${params.id}:${params.actor}:${params.action}:${params.payloadHash}:${params.createdAt}`;
    return sha256(data);
}
//# sourceMappingURL=hash.js.map