import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { damageClaims, bookings, inventoryUnits, rentalAgreements } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { requireAdmin } from "@/lib/requireAdmin";
import { USER_ROLES } from "@/lib/constants";
import { v4 as uuid } from "uuid";

export async function GET(req: NextRequest) {
    const { user, error } = await requireAdmin([
        USER_ROLES.ADMIN,
        USER_ROLES.SUPER_ADMIN,
        USER_ROLES.WAREHOUSE_MANAGER,
    ]);
    if (error) return error;

    try {
        const url = new URL(req.url);
        const bookingId = url.searchParams.get("bookingId");
        const status = url.searchParams.get("status");

        const claims = await db.query.damageClaims.findMany({
            where: and(
                bookingId ? eq(damageClaims.bookingId, bookingId) : undefined,
                status ? eq(damageClaims.status, status) : undefined,
            ),
            orderBy: [desc(damageClaims.createdAt)],
            with: {
                booking: {
                    with: { product: true, user: true }
                },
                unit: true,
                filer: true,
            }
        });

        return NextResponse.json({ claims });
    } catch (e: any) {
        console.error("GET /api/warehouse/damage-claims error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const { user, error } = await requireAdmin([
        USER_ROLES.ADMIN,
        USER_ROLES.SUPER_ADMIN,
        USER_ROLES.WAREHOUSE_MANAGER,
    ]);
    if (error) return error;

    try {
        const body = await req.json();
        const {
            bookingId,
            inventoryUnitId,
            inspectionLogId,
            incidentDescription,
            severity = "moderate",
            partsCost = 0,
            laborCost = 0,
            photoUrls = [],
        } = body;

        if (!bookingId || !incidentDescription) {
            return NextResponse.json({ error: "bookingId and incidentDescription are required." }, { status: 400 });
        }

        const booking = await db.query.bookings.findFirst({
            where: eq(bookings.id, bookingId),
            with: { agreements: true }
        });

        if (!booking) {
            return NextResponse.json({ error: "Booking not found." }, { status: 404 });
        }

        // Determine security deposit held
        const agreement = booking.agreements?.[0];
        const securityDepositHeld = agreement?.securityDepositAmount || Math.round((booking.totalPrice || 2000) * 0.20);

        const numPartsCost = parseFloat(partsCost) || 0;
        const numLaborCost = parseFloat(laborCost) || 0;
        const totalClaim = numPartsCost + numLaborCost;

        const amountDeducted = Math.min(securityDepositHeld, totalClaim);
        const amountRefunded = Math.max(0, securityDepositHeld - amountDeducted);

        const claimId = uuid();
        const claimNumber = `CLM-${Date.now().toString(36).toUpperCase()}`;

        const [createdClaim] = await db.insert(damageClaims).values({
            id: claimId,
            claimNumber,
            bookingId,
            inventoryUnitId: inventoryUnitId || null,
            inspectionLogId: inspectionLogId || null,
            incidentDescription,
            photoUrls,
            severity,
            partsCost: numPartsCost,
            laborCost: numLaborCost,
            totalClaimAmount: totalClaim,
            securityDepositHeld,
            amountDeducted,
            amountRefunded,
            status: "settled_deducted",
            filedBy: user.id,
            settledAt: new Date(),
        }).returning();

        // Update physical unit condition to damaged / in_maintenance
        if (inventoryUnitId) {
            await db.update(inventoryUnits)
                .set({
                    availabilityStatus: "in_maintenance",
                    conditionStatus: severity === "total_loss" ? "retired" : "damaged",
                    updatedAt: new Date(),
                })
                .where(eq(inventoryUnits.id, inventoryUnitId));
        }

        return NextResponse.json({
            success: true,
            claim: createdClaim,
            message: `Damage Claim #${claimNumber} filed. QAR ${amountDeducted.toLocaleString()} deducted from deposit; QAR ${amountRefunded.toLocaleString()} balance to refund.`
        }, { status: 201 });

    } catch (e: any) {
        console.error("POST /api/warehouse/damage-claims error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
