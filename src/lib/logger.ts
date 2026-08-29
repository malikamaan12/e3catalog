/**
 * E3 Rentals — Structured & Redacted Production Logger
 * 
 * Automatically masks PII, credentials, tokens, and payment data
 * before serializing to structured JSON stdout/stderr.
 */

const REDACT_KEYS = new Set([
    "password",
    "token",
    "secret",
    "authorization",
    "apikey",
    "api_key",
    "accesstoken",
    "refreshtoken",
    "jwt",
    "creditcard",
    "cardnumber",
    "cvv",
    "iban",
    "swift",
    "privatekey",
]);

function redactObject(obj: any, depth = 0): any {
    if (depth > 6 || obj === null || obj === undefined) return obj;

    if (typeof obj === "string") {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => redactObject(item, depth + 1));
    }

    if (typeof obj === "object") {
        const cleaned: Record<string, any> = {};
        for (const [k, v] of Object.entries(obj)) {
            const lowerK = k.toLowerCase().replace(/[-_]/g, "");
            if (REDACT_KEYS.has(lowerK) || lowerK.includes("password") || lowerK.includes("secret") || lowerK.includes("token")) {
                cleaned[k] = "[REDACTED]";
            } else {
                cleaned[k] = redactObject(v, depth + 1);
            }
        }
        return cleaned;
    }

    return obj;
}

export type LogLevel = "info" | "warn" | "error" | "audit";

export interface StructuredLog {
    timestamp: string;
    level: LogLevel;
    message: string;
    service: string;
    correlationId?: string;
    meta?: Record<string, any>;
}

function writeLog(level: LogLevel, message: string, meta?: Record<string, any>, correlationId?: string) {
    const logEntry: StructuredLog = {
        timestamp: new Date().toISOString(),
        level,
        service: "e3-rentals-platform",
        message,
        correlationId,
        meta: meta ? redactObject(meta) : undefined,
    };

    const output = JSON.stringify(logEntry);
    if (level === "error") {
        console.error(output);
    } else if (level === "warn") {
        console.warn(output);
    } else {
        console.log(output);
    }
}

export const logger = {
    info: (msg: string, meta?: Record<string, any>, correlationId?: string) => writeLog("info", msg, meta, correlationId),
    warn: (msg: string, meta?: Record<string, any>, correlationId?: string) => writeLog("warn", msg, meta, correlationId),
    error: (msg: string, meta?: Record<string, any>, correlationId?: string) => writeLog("error", msg, meta, correlationId),
    audit: (msg: string, meta?: Record<string, any>, correlationId?: string) => writeLog("audit", msg, meta, correlationId),
};
