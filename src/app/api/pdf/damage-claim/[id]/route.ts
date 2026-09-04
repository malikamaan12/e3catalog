import { NextRequest, NextResponse } from "next/server";
import { renderToStream } from "@react-pdf/renderer";
import DamageClaimVoucherPDF from "@/components/finance/DamageClaimVoucherPDF";
import { db } from "@/lib/db";
import { damageClaims } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { format } from "date-fns";
import { getCurrentUser } from "@/lib/auth";
import { USER_ROLES } from "@/lib/constants";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

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

        // Auth check
        const isStaff = user.role === USER_ROLES.ADMIN || 
                        user.role === USER_ROLES.SUPER_ADMIN || 
                        user.role === USER_ROLES.WAREHOUSE_MANAGER;
        const isClientOwner = claim.booking?.userId === user.id;

        if (!isStaff && !isClientOwner) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        const data = {
            claimNumber: claim.claimNumber,
            date: format(new Date(claim.createdAt), "MMMM do, yyyy"),
            severity: claim.severity.toUpperCase(),
            status: claim.status,
            clientName: claim.booking?.customerName || claim.booking?.user?.name || "Responsible Client",
            clientEmail: claim.booking?.customerEmail || claim.booking?.user?.email || "N/A",
            clientPhone: claim.booking?.customerPhone || undefined,
            bookingRef: claim.bookingId,
            projectName: claim.booking?.projectName || "Live Production",
            assetTagCode: claim.unit?.assetTagCode || "E3-ASSET-RETURN",
            productName: claim.booking?.product?.name || "Production Equipment",
            incidentDescription: claim.incidentDescription,
            partsCost: claim.partsCost,
            laborCost: claim.laborCost,
            totalClaimAmount: claim.totalClaimAmount,
            securityDepositHeld: claim.securityDepositHeld,
            amountDeducted: claim.amountDeducted,
            amountRefunded: claim.amountRefunded,
            filedByName: claim.filer?.name || "Technical Operations Lead",
        };

        const stream = await renderToStream(DamageClaimVoucherPDF({ data }));

        return new Response(stream as any, {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `inline; filename="E3-Damage-Claim-${claim.claimNumber}.pdf"`,
            }
        });

    } catch (e: any) {
        console.error("PDF damage claim error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
