import { db } from "./db";
import { systemLogs } from "./db/schema";
import { v4 as uuidv4 } from "uuid";

interface AuditLogParams {
    adminId: string;
    action: string;
    targetId: string;
    targetType: string;
    details?: any;
}

/**
 * Standardized utility to record administrative actions in the system audit logs.
 * Actions are immutable and stored in the system_logs table.
 */
export async function logAuditAction({
    adminId,
    action,
    targetId,
    targetType,
    details
}: AuditLogParams) {
    try {
        const logEntry = {
            id: uuidv4(),
            adminId,
            action,
            targetId,
            targetType,
            details: details ? (typeof details === 'string' ? details : JSON.stringify(details)) : null,
            createdAt: new Date(),
        };

        await db.insert(systemLogs).values(logEntry);
        console.log(`[AUDIT LOG] ${action} by ${adminId} on ${targetType}:${targetId}`);
        return true;
    } catch (err) {
        console.error("Failed to record audit log:", err);
        return false;
    }
}
