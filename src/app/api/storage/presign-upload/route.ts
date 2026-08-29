import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createPresignedUploadUrl } from "@/lib/storage";
import { v4 as uuid } from "uuid";

export async function POST(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json().catch(() => ({}));
        const filename = body.filename ? String(body.filename).trim() : "file";
        const contentType = body.contentType ? String(body.contentType).trim() : "application/octet-stream";
        const isPrivate = Boolean(body.isPrivate);
        const folder = isPrivate ? "private" : "public";
        const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
        const key = `${folder}/${user.role}/${user.id}/${uuid()}-${sanitizedFilename}`;

        const presigned = await createPresignedUploadUrl({
            key,
            contentType,
            isPrivate,
            expiresInSeconds: 900, // 15 mins
        });

        return NextResponse.json({
            success: true,
            uploadUrl: presigned.uploadUrl,
            key: presigned.key,
            isPrivate: presigned.isPrivate,
            expiresInSeconds: presigned.expiresInSeconds,
        });
    } catch (err: any) {
        console.error("[Storage] Presign upload error:", err.message);
        return NextResponse.json({ error: "Failed to generate upload URL" }, { status: 500 });
    }
}
