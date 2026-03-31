import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SECRET_KEY = new TextEncoder().encode(
    process.env.JWT_SECRET || process.env.AUTHENTICATION_SECRET || "default_super_secret_key_for_development"
);

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const sessionToken = request.cookies.get("e3_session")?.value;

    // Handle session verification
    let payload: { role: string } | null = null;
    if (sessionToken) {
        try {
            const { payload: decoded } = await jwtVerify(sessionToken, SECRET_KEY);
            payload = decoded as { role: string };
        } catch (err) {
            console.error("Middleware Auth Error:", err);
        }
    }

    // Role-Based Access Control logic
    if (payload?.role === "warehouse_manager") {
        // Strictly block financial, quotes, vendors, and settings
        const restrictedPaths = [
            "/dashboard/finance",
            "/dashboard/quotes",
            "/dashboard/vendors",
            "/dashboard/settings",
            "/admin" // Implicitly block all super admin legacy routes
        ];

        if (restrictedPaths.some(p => pathname.startsWith(p))) {
            return NextResponse.redirect(new URL("/dashboard/warehouse/overview", request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/dashboard/:path*",
        "/admin/:path*",
    ],
};
