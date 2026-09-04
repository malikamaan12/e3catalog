import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vendorSettlementStatements } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/requireAdmin";
import { USER_ROLES } from "@/lib/constants";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { user, error } = await requireAdmin([
        USER_ROLES.ADMIN,
        USER_ROLES.SUPER_ADMIN,
        USER_ROLES.VENDOR,
    ]);
    if (error) return error;

    const { id } = await params;

    try {
        const statement = await db.query.vendorSettlementStatements.findFirst({
            where: eq(vendorSettlementStatements.id, id),
            with: {
                vendor: true,
                items: {
                    with: {
                        booking: {
                            with: { product: true }
                        }
                    }
                }
            }
        });

        if (!statement) {
            return NextResponse.json({ error: "Statement not found" }, { status: 404 });
        }

        // If vendor user, ensure they own this statement
        if (user.role === USER_ROLES.VENDOR && user.vendorId && statement.vendorId !== user.vendorId) {
            return NextResponse.json({ error: "Unauthorized to access this settlement statement." }, { status: 403 });
        }

        return NextResponse.json({ statement });
    } catch (e: any) {
        console.error("GET /api/admin/settlements/statements/[id] error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { error } = await requireAdmin([
        USER_ROLES.ADMIN,
        USER_ROLES.SUPER_ADMIN,
    ]);
    if (error) return error;

    const { id } = await params;

    try {
        const body = await request.json();
        const { status, transactionReference, bankName, bankIban, notes } = body;

        const statement = await db.query.vendorSettlementStatements.findFirst({
            where: eq(vendorSettlementStatements.id, id),
        });

        if (!statement) {
            return NextResponse.json({ error: "Statement not found" }, { status: 404 });
        }

        const updateData: Partial<typeof vendorSettlementStatements.$inferInsert> = {
            updatedAt: new Date(),
        };

        if (status) {
            updateData.status = status;
            if (status === "paid") {
                updateData.paidAt = new Date();
            }
        }
        if (transactionReference !== undefined) updateData.transactionReference = transactionReference;
        if (bankName !== undefined) updateData.bankName = bankName;
        if (bankIban !== undefined) updateData.bankIban = bankIban;
        if (notes !== undefined) updateData.notes = notes;

        const [updated] = await db
            .update(vendorSettlementStatements)
            .set(updateData)
            .where(eq(vendorSettlementStatements.id, id))
            .returning();

        return NextResponse.json({
            success: true,
            statement: updated,
            message: `Statement #${updated.statementNumber} updated to status '${updated.status}'.`
        });
    } catch (e: any) {
        console.error("PATCH /api/admin/settlements/statements/[id] error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
