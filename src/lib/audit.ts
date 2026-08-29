import { db } from "./db";
import { auditLogs } from "./db/schema";
import { v4 as uuid } from "uuid";

export interface AuditEventParams {
    actorId?: string;
    actorEmail?: string;
    actorRole?: string;
    tenantId?: string;
    action: string;
    objectType: string;
    objectId?: string;
    beforeState?: any;
    afterState?: any;
    reason?: string;
    correlationId?: string;
    ipAddress?: string;
    userAgent?: string;
    severity?: "info" | "warning" | "critical";
    metadata?: Record<string, any>;
}

const SENSITIVE_KEYS = new Set([
    "password",
    "token",
    "secret",
    "jwt",
    "apikey",
    "api_key",
    "authorization",
    "creditcard",
    "credit_card",
    "cvv",
    "iban",
    "swift",
    "accountnumber",
    "account_number",
    "signaturedata",
    "signature_data",
    "privatekey",
    "private_key"
]);

/**
 * Recursively strips sensitive fields (passwords, tokens, bank secrets, signatures)
 * from objects prior to persisting in audit trails.
 */
export function sanitizeAuditData(data: any): any {
    if (!data) return data;
    if (typeof data !== "object") return data;

    if (Array.isArray(data)) {
        return data.map(item => sanitizeAuditData(item));
    }

    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
        const lowerKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (SENSITIVE_KEYS.has(lowerKey)) {
            sanitized[key] = "[REDACTED]";
        } else if (typeof value === "object" && value !== null) {
            sanitized[key] = sanitizeAuditData(value);
        } else {
            sanitized[key] = value;
        }
    }
    return sanitized;
}

/**
 * Computes a clean before/after state diff.
 */
export function generateSafeDiff(before: any, after: any): { before: any; after: any } {
    const cleanBefore = sanitizeAuditData(before);
    const cleanAfter = sanitizeAuditData(after);
    return { before: cleanBefore, after: cleanAfter };
}

/**
 * Persists an append-only audit log entry.
 */
export async function logAuditEvent(params: AuditEventParams): Promise<string> {
    const logId = uuid();
    const correlationId = params.correlationId || uuid();

    const cleanBefore = sanitizeAuditData(params.beforeState);
    const cleanAfter = sanitizeAuditData(params.afterState);
    const cleanMetadata = sanitizeAuditData(params.metadata);

    await db.insert(auditLogs).values({
        id: logId,
        actorId: params.actorId,
        actorEmail: params.actorEmail,
        actorRole: params.actorRole,
        tenantId: params.tenantId,
        action: params.action,
        objectType: params.objectType,
        objectId: params.objectId,
        beforeState: cleanBefore,
        afterState: cleanAfter,
        reason: params.reason,
        correlationId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        severity: params.severity || "info",
        metadata: cleanMetadata,
        createdAt: new Date(),
    });

    return logId;
}
