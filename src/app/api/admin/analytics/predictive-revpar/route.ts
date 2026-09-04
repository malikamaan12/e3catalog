import { NextRequest, NextResponse } from "next/server";
import { getPredictiveUtilizationHeatmap, getExecutiveRevParMetrics } from "@/lib/fleet-analytics";

export async function GET(req: NextRequest) {
    try {
        const [heatmap, revPar] = await Promise.all([
            getPredictiveUtilizationHeatmap(),
            getExecutiveRevParMetrics(),
        ]);

        return NextResponse.json({
            heatmap,
            revPar,
            generatedAt: new Date().toISOString(),
        });
    } catch (err: any) {
        console.error("Predictive revpar analytics error:", err);
        return NextResponse.json({ error: err.message || "Failed to calculate predictive analytics" }, { status: 500 });
    }
}
