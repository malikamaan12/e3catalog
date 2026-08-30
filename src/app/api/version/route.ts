import { NextResponse } from "next/server";
import { getVersionInfo } from "@/lib/version";

export async function GET() {
    const info = getVersionInfo();
    return NextResponse.json({
        version: info.version,
        commitSha: info.commitSha,
        branch: info.commitRef,
        timestamp: new Date().toISOString(),
        environment: info.environment,
    });
}
