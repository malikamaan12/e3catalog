import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { complianceRules } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { hasPermission } from "@/lib/permissions";
import { logAuditEvent } from "@/lib/audit";
import { v4 as uuid } from "uuid";

export async function GET(req: Request) {
    try {
        const { user, error } = await requireAuth();
        if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        if (!hasPermission(user.role, "global_search")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        const rules = await db.select().from(complianceRules).orderBy(desc(complianceRules.createdAt));
        return NextResponse.json({ rules });
    } catch (err: any) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { user, error } = await requireAuth();
        if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        if (!hasPermission(user.role, "manage_platform_settings")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        const body = await req.json();
        const { ruleCode, ruleType, name, description, targetType, targetId, parameters, isMandatory } = body;

        if (!ruleCode || !ruleType || !name || !targetType || !parameters) {
            return NextResponse.json({ error: "Missing required rule parameters" }, { status: 400 });
        }

        const ruleId = uuid();
        await db.insert(complianceRules).values({
            id: ruleId,
            ruleCode,
            ruleType,
            name,
            description,
            targetType,
            targetId,
            parameters,
            isMandatory: isMandatory ?? true,
            isActive: true,
            version: 1,
            effectiveDate: new Date(),
            createdBy: user.id,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        await logAuditEvent({
            actorId: user.id,
            actorEmail: user.email,
            actorRole: user.role,
            action: "compliance_rule.created",
            objectType: "compliance_rule",
            objectId: ruleId,
            afterState: { ruleCode, ruleType, name, parameters },
            severity: "info",
        });

        return NextResponse.json({ success: true, ruleId });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
    }
}
