import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { safetyCertificates } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { hasPermission } from "@/lib/permissions";
import { logAuditEvent } from "@/lib/audit";
import { v4 as uuid } from "uuid";

export async function GET(req: Request) {
    try {
        const { user, error } = await requireAuth();
        if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        if (!hasPermission(user.role, "global_search")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        const certs = await db.select({
            id: safetyCertificates.id,
            productId: safetyCertificates.productId,
            certName: safetyCertificates.certName,
            certNumber: safetyCertificates.certNumber,
            issuingBody: safetyCertificates.issuingBody,
            issueDate: safetyCertificates.issueDate,
            expiryDate: safetyCertificates.expiryDate,
        }).from(safetyCertificates)
          .orderBy(desc(safetyCertificates.issueDate))
          .limit(100);

        return NextResponse.json({ certificates: certs });
    } catch (err: any) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { user, error } = await requireAuth();
        if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        if (!hasPermission(user.role, "modify_inventory")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        const body = await req.json();
        const { productId, certName, certNumber, issuingBody, issueDate, expiryDate } = body;

        if (!productId || !certName || !issueDate || !expiryDate) {
            return NextResponse.json({ error: "Product ID, cert name, issue date, and expiry date are required" }, { status: 400 });
        }

        const certId = uuid();
        await db.insert(safetyCertificates).values({
            id: certId,
            productId,
            certName,
            certNumber,
            issuingBody,
            issueDate: new Date(issueDate),
            expiryDate: new Date(expiryDate),
        });

        await logAuditEvent({
            actorId: user.id,
            actorEmail: user.email,
            actorRole: user.role,
            action: "certificate.created",
            objectType: "safety_certificate",
            objectId: certId,
            afterState: { productId, certName, expiryDate },
            severity: "info",
        });

        return NextResponse.json({ success: true, certificateId: certId });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
    }
}
