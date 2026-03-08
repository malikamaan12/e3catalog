import { checkAvailability } from "@/lib/availability";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { productId, startDate, endDate, quantity, startTime, endTime } = body;

        if (!productId || !startDate || !endDate || !quantity) {
            return NextResponse.json(
                { error: "Missing required fields: productId, startDate, endDate, quantity" },
                { status: 400 }
            );
        }

        const result = await checkAvailability({
            productId,
            startDate,
            endDate,
            quantity: Number(quantity),
            startTime,
            endTime,
        });

        return NextResponse.json(result);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Internal server error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
