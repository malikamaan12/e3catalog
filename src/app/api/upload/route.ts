import { NextRequest, NextResponse } from "next/server";
import { generatePresignedUploadUrl, getPublicCDNUrl } from "@/lib/s3";
import { requireAdmin } from "@/lib/requireAdmin";
import { v4 as uuid } from "uuid";

export async function POST(req: NextRequest) {
    try {
        // Check that R2 credentials are configured
        const missingVars = [];
        if (!process.env.S3_ACCESS_KEY_ID) missingVars.push("S3_ACCESS_KEY_ID");
        if (!process.env.S3_SECRET_ACCESS_KEY) missingVars.push("S3_SECRET_ACCESS_KEY");
        if (!process.env.S3_ENDPOINT) missingVars.push("S3_ENDPOINT");
        if (!process.env.S3_BUCKET_NAME) missingVars.push("S3_BUCKET_NAME");

        if (missingVars.length > 0) {
            console.error("STORAGE CONFIG ERROR: Missing env vars:", missingVars.join(", "));
            return NextResponse.json(
                { error: `Storage not configured. Missing environment variables: ${missingVars.join(", ")}` },
                { status: 500 }
            );
        }

        // Validate that request body exists and is not empty
        let body;
        try {
            body = await req.json();
        } catch (e) {
            console.error("UPLOAD ERROR: Empty or invalid JSON body");
            return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
        }
        
        const { filename, contentType, folder = "uploads" } = body;

        let user = null;
        if (folder !== "kyc") {
            const authCheck = await requireAdmin(["super_admin", "admin", "vendor"]);
            if (authCheck.error) {
                console.error("UPLOAD AUTH ERROR: User not authorized to upload to folder:", folder);
                return authCheck.error;
            }
            user = authCheck.user;
            console.log("Upload request from user:", { id: user.id, role: user.role });
        }

        if (!filename || !contentType) {
            console.error("UPLOAD ERROR: Missing filename or contentType");
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
        console.log("Generating presigned URL for key:", key, "contentType:", contentType);

        const result = await generatePresignedUploadUrl(key, contentType);

        if (result.error) {
            console.error("S3 Presigned URL error:", result.error);
            return NextResponse.json({ error: "Failed to generate upload URL: " + result.error }, { status: 500 });
        }

        console.log("Presigned URL generated successfully.");
        return NextResponse.json({
            url: result.url,
            key: result.key,
            publicUrl: getPublicCDNUrl(key),
        });
    } catch (err: any) {
        console.error("Upload API FATAL error:", err);
        return NextResponse.json({ error: "Server-side upload error: " + err.message }, { status: 500 });
    }
}
