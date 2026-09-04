import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { damageClaims } from "@/lib/db/schema";
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
        USER_ROLES.WAREHOUSE_MANAGER,
        USER_ROLES.CLIENT,
    ]);
    if (error) return error;

    const { id } = await params;

    try {
        const claim = await db.query.damageClaims.findFirst({
            where: eq(damageClaims.id, id),
            with: {
                booking: {
                    with: { product: true, user: true }
                },
                unit: true,
                filer: true,
            }
        });

        if (!claim) {
            return NextResponse.json({ error: "Damage claim not found" }, { status: 404 });
        }

        // Check ownership if client
        if (user.role === USER_ROLES.CLIENT && claim.booking?.userId !== user.id) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        return NextResponse.json({ claim });
    } catch (e: any) {
        console.error("GET /api/warehouse/damage-claims/[id] error:", e);
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
        USER_ROLES.WAREHOUSE_MANAGER,
    ]);
    if (error) return error;

    const { id } = await params;

    try {
        const body = await request.json();
        const { status, adminResolutionNotes, clientDisputeReason } = body;

        const updateData: Partial<typeof damageClaims.$inferInsert> = {
            updatedAt: new Date(),
        };

        if (status) updateData.status = status;
        if (adminResolutionNotes !== undefined) updateData.adminResolutionNotes = adminResolutionNotes;
        if (clientDisputeReason !== undefined) updateData.clientDisputeReason = clientDisputeReason;

        const [updated] = await db.update(damageClaims)
            .set(updateData)
            .where(eq(damageClaims.id, id))
            .returning();

        return NextResponse.json({ success: true, claim: updated });
    } catch (e: any) {
        console.error("PATCH /api/warehouse/damage-claims/[id] error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
