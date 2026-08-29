import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import * as crypto from "crypto";

export async function PUT(req: NextRequest) {
    const key = req.nextUrl.searchParams.get("key") || "";
    const expiresStr = req.nextUrl.searchParams.get("expires") || "0";
    const sig = req.nextUrl.searchParams.get("sig") || "";

    const expiresAt = parseInt(expiresStr, 10);
    if (Date.now() > expiresAt) {
        return NextResponse.json({ error: "Presigned upload URL has expired" }, { status: 403 });
    }

    const expectedSig = crypto
        .createHmac("sha256", env.AUTHENTICATION_SECRET)
        .update(`upload:${key}:${expiresAt}:${key.startsWith("private/") ? "1" : "0"}`)
        .digest("hex");

    if (sig !== expectedSig) {
        return NextResponse.json({ error: "Invalid presigned URL signature" }, { status: 403 });
    }

    return NextResponse.json({
        success: true,
        message: "Development upload simulated successfully",
        key,
    });
}
