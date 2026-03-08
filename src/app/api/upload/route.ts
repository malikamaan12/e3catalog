import { NextRequest, NextResponse } from "next/server";
import { generatePresignedUploadUrl, getPublicCDNUrl } from "@/lib/s3";
import { requireAdmin } from "@/lib/requireAdmin";
import { v4 as uuid } from "uuid";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { filename, contentType, folder = "uploads" } = body;

        let user = null;
        if (folder !== "kyc") {
            const authCheck = await requireAdmin(["super_admin", "admin", "vendor"]);
            if (authCheck.error) return authCheck.error;
            user = authCheck.user;
        }

        if (!filename || !contentType) {
            return NextResponse.json({ error: "Filename and contentType are required" }, { status: 400 });
        }

        // Clean filename and create a unique key
        const cleanName = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
        const uniqueId = uuid().split("-")[0]; // Short unique ID

        // Tenant partitioning for vendors
        let prefix = folder;
        if (user && user.role === "vendor" && (user as any).vendorId) {
            prefix = `vendors/${(user as any).vendorId}/${folder}`;
        }

        const key = `${prefix}/${uniqueId}-${cleanName}`;

        const result = await generatePresignedUploadUrl(key, contentType);

        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json({
            url: result.url,
            key: result.key,
            publicUrl: getPublicCDNUrl(key),
        });
    } catch (err) {
        console.error("Upload API error:", err);
        return NextResponse.json({ error: "Failed to process upload request" }, { status: 500 });
    }
}
