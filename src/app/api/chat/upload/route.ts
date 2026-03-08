import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const fileName = `${uuidv4()}-${file.name.replace(/\s+/g, "_")}`;
        const uploadDir = path.join(process.cwd(), "public", "uploads", "chat");

        // Ensure directory exists
        await mkdir(uploadDir, { recursive: true });

        const filePath = path.join(uploadDir, fileName);
        await writeFile(filePath, buffer);

        const fileUrl = `/uploads/chat/${fileName}`;
        const fileType = file.type.startsWith("image/") ? "image" :
            file.type.startsWith("video/") ? "video" : "document";

        return NextResponse.json({
            url: fileUrl,
            type: fileType,
            name: file.name
        });

    } catch (error: any) {
        console.error("Upload error:", error);
        return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
    }
}
