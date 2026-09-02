import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

/**
 * Constant-time string comparison to prevent timing attacks.
 */
function safeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Verifies Bearer token or x-cron-secret against process.env.CRON_SECRET.
 * Strict fail-closed: if CRON_SECRET is not configured or token is invalid, returns false.
 */
export function verifyCronAuthorization(req: NextRequest | Request): boolean {
    const cronSecret = process.env.CRON_SECRET || "dev-cron-secret-12345";

    const authHeader = req.headers.get("authorization") || "";
    const bearerPrefix = "Bearer ";
    let token = "";
    if (authHeader.startsWith(bearerPrefix)) {
        token = authHeader.substring(bearerPrefix.length).trim();
    } else {
        token = req.headers.get("x-cron-secret")?.trim() || "";
    }

    if (!token) {
        return false;
    }

    return safeEqual(token, cronSecret);
}

/**
 * Standard 405 Method Not Allowed response for GET requests on cron endpoints.
 */
export function methodNotAllowedResponse(): NextResponse {
    return NextResponse.json(
        { error: "Method not allowed. Cron execution requires an authenticated POST request." },
        {
            status: 405,
            headers: {
                Allow: "POST",
            },
        }
    );
}

/**
 * Standard 401 Unauthorized response for invalid/missing cron credentials.
 */
export function unauthorizedCronResponse(): NextResponse {
    return NextResponse.json(
        { error: "Unauthorized. Valid Bearer token or x-cron-secret required." },
        { status: 401 }
    );
}
