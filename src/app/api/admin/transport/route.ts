import { db } from "@/lib/db";
import { bookingDispatchLogs } from "@/lib/db/schema";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";

export async function GET() {
    const { user, error } = await requireAdmin(["admin", "super_admin", "warehouse_manager", "vendor"]);
    if (error) return error;

    try {
        const logs = await db.query.bookingDispatchLogs.findMany({
            with: {
                booking: true
            },
            orderBy: (logs, { desc }) => [desc(logs.dispatchedAt)]
        });

        // Map and format payload for the dashboard
        const payload = logs.map(log => ({
            id: log.id,
            bookingId: log.bookingId,
            projectName: log.booking?.projectName || log.booking?.customerName || "Walk-in Client",
            driverName: log.driverName,
            vehiclePlateNumber: log.vehiclePlateNumber,
            transportCompany: log.transportCompany,
            totalGrossWeight: log.totalGrossWeight,
            dispatchedAt: log.dispatchedAt,
        }));

        return NextResponse.json(payload);
    } catch (err: any) {
        console.error("Failed to fetch transport logs:", err);
        return NextResponse.json({ error: "Failed to load logs" }, { status: 500 });
    }
}
