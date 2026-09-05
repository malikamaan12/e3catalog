import { NextRequest, NextResponse } from "next/server";
import { receiveSubRentalUnit, finalizeSubRentalReturn } from "@/lib/cross-hire";
import { requireAdmin } from "@/lib/requireAdmin";
import { USER_ROLES } from "@/lib/constants";

export async function POST(req: NextRequest) {
    const { user, error } = await requireAdmin([
        USER_ROLES.ADMIN,
        USER_ROLES.SUPER_ADMIN,
        USER_ROLES.WAREHOUSE_MANAGER,
    ]);
    if (error) return error;

    try {
        const body = await req.json();
        const { crossHireOrderId, vendorSerial, warehouseLocation, condition, customAliasTag, action } = body;

        if (action === "return") {
            const result = await finalizeSubRentalReturn(crossHireOrderId);
            return NextResponse.json(result);
        }

        if (!crossHireOrderId) {
            return NextResponse.json({ error: "crossHireOrderId is required" }, { status: 400 });
        }

        const result = await receiveSubRentalUnit({
            crossHireOrderId,
            vendorSerial,
            warehouseLocation,
            condition,
            customAliasTag,
        });

        return NextResponse.json({ success: true, ...result });
    } catch (e: any) {
        console.error("POST /api/admin/cross-hires/receive error:", e);
        return NextResponse.json({ error: e.message || "Failed to receive unit" }, { status: 500 });
    }
}
