import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createPresignedDownloadUrl } from "@/lib/storage";

export async function POST(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json().catch(() => ({}));
        const key = body.key ? String(body.key).trim() : "";

        if (!key) {
            return NextResponse.json({ error: "Storage key is required" }, { status: 400 });
        }

        const isPrivate = key.startsWith("private/");

        // Authorization check for private documents
        if (isPrivate) {
            const isAdmin = ["admin", "super_admin"].includes(user.role);
            const isOwner = key.includes(`/${user.id}/`) || (user.vendorId && key.includes(`/${user.vendorId}/`));

            if (!isAdmin && !isOwner) {
                return NextResponse.json({ error: "Forbidden: You do not have access to this private document" }, { status: 403 });
            }
        }

        const presigned = await createPresignedDownloadUrl({
            key,
            isPrivate,
            expiresInSeconds: 900, // 15 mins
        });

        return NextResponse.json({
            success: true,
            downloadUrl: presigned.downloadUrl,
            key: presigned.key,
            expiresAt: presigned.expiresAt.toISOString(),
        });
    } catch (err: any) {
        console.error("[Storage] Presign download error:", err.message);
        return NextResponse.json({ error: "Failed to generate download URL" }, { status: 500 });
    }
}
