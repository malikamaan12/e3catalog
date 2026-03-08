import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SECRET_KEY = new TextEncoder().encode(
    process.env.JWT_SECRET || "default_super_secret_key_for_development"
);

async function getSession(req: NextRequest) {
    const token = req.cookies.get("e3_session")?.value;
    if (!token) return null;
    try {
        const { payload } = await jwtVerify(token, SECRET_KEY);
        return payload as { id: string; email: string; role: string };
    } catch {
        return null;
    }
}

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    const isAdminRoute = pathname.startsWith("/admin");
    const isDashboardRoute = pathname.startsWith("/dashboard");

    // Resolve session from cookie
    const session = await getSession(req);

    // ── Rule 1: Unauthenticated user hitting a protected route ──
    if (!session) {
        if (isAdminRoute || isDashboardRoute) {
            const loginUrl = new URL("/login", req.url);
            loginUrl.searchParams.set("from", pathname);
            return NextResponse.redirect(loginUrl);
        }
        return NextResponse.next();
    }

    const role = session.role;
    const isAnyAdmin = ["admin", "super_admin", "sales_rep", "warehouse_manager", "vendor"].includes(role);

    // ── Rule 2: Client user trying to access Admin Area ──
    if (isAdminRoute && !isAnyAdmin) {
        // Block client from admin — redirect to their own dashboard
        return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // ── Rule 3: Admin user trying to access Client Dashboard ──
    if (isDashboardRoute && isAnyAdmin) {
        // Admins have no business on the client dashboard — send to admin
        return NextResponse.redirect(new URL("/admin", req.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/admin/:path*",
        "/dashboard/:path*",
    ],
};
