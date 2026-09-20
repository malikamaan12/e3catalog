import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { flightCases, flightCaseContents, inventoryUnits } from "@/lib/db/schema";
import { eq, or } from "drizzle-orm";
import { requireAdmin } from "@/lib/requireAdmin";
import { USER_ROLES } from "@/lib/constants";
import { 
    verifyFlightCasePack, 
    verifyFlightCaseReturn, 
    STANDARD_ACCESSORY_PENALTIES 
} from "@/lib/kit-assemblies";

// GET /api/admin/warehouse/kit-audit?query=...
export async function GET(req: NextRequest) {
    const { user, error } = await requireAdmin([
        USER_ROLES.ADMIN,
        USER_ROLES.SUPER_ADMIN,
        USER_ROLES.WAREHOUSE_MANAGER,
        USER_ROLES.VENDOR,
    ]);
    if (error) return error;

    try {
        const { searchParams } = new URL(req.url);
        const query = searchParams.get("query") || searchParams.get("flightCaseId");

        if (!query) {
            return NextResponse.json({ error: "Query parameter (caseNumber, assetTag, or flightCaseId) is required." }, { status: 400 });
        }

        // Search flight case
        const [fc] = await db
            .select()
            .from(flightCases)
            .where(
                or(
                    eq(flightCases.id, query),
                    eq(flightCases.caseNumber, query),
                    eq(flightCases.assetTagCode, query),
                    eq(flightCases.rfidTag, query)
                )
            )
            .limit(1);

        if (!fc) {
            return NextResponse.json({ error: "Flight case not found." }, { status: 404 });
        }

        // Fetch contents
        const contents = await db
            .select({
                id: flightCaseContents.id,
                accessoryName: flightCaseContents.accessoryName,
                expectedQuantity: flightCaseContents.expectedQuantity,
                isPermanentChild: flightCaseContents.isPermanentChild,
                isVerifiedPacked: flightCaseContents.isVerifiedPacked,
                inventoryUnitId: flightCaseContents.inventoryUnitId,
                assetTagCode: inventoryUnits.assetTagCode,
                conditionStatus: inventoryUnits.conditionStatus,
            })
            .from(flightCaseContents)
            .leftJoin(inventoryUnits, eq(flightCaseContents.inventoryUnitId, inventoryUnits.id))
            .where(eq(flightCaseContents.flightCaseId, fc.id));

        return NextResponse.json({
            success: true,
            flightCase: fc,
            contents,
            standardPenalties: STANDARD_ACCESSORY_PENALTIES,
        });
    } catch (err: any) {
        console.error("GET /api/admin/warehouse/kit-audit error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// POST /api/admin/warehouse/kit-audit
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
            flightCaseId,
            action = "pack", // "pack" | "return"
            scannedTags = [],
            bookingId,
        } = body;

        if (!flightCaseId) {
            return NextResponse.json({ error: "flightCaseId is required." }, { status: 400 });
        }

        if (action === "pack") {
            const result = await verifyFlightCasePack({
                flightCaseId,
                scannedTags,
                verifiedBy: user.id,
            });
            return NextResponse.json({ success: true, action: "pack", ...result });
        }

        if (action === "return") {
            const result = await verifyFlightCaseReturn({
                flightCaseId,
                returnedTags: scannedTags,
                bookingId,
                filedBy: user.id,
            });
            return NextResponse.json({ success: true, action: "return", ...result });
        }

        return NextResponse.json({ error: "Invalid action. Must be 'pack' or 'return'." }, { status: 400 });
    } catch (err: any) {
        console.error("POST /api/admin/warehouse/kit-audit error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
