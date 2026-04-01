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

export default async function middleware(req: NextRequest) {
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

    // ── Rule 2: Warehouse Manager RBAC Limits ──
    if (role === "warehouse_manager") {
        const restrictedPaths = [
            "/dashboard/finance",
            "/dashboard/quotes",
            "/dashboard/vendors",
            "/dashboard/settings",
            "/admin"
        ];
        if (restrictedPaths.some(p => pathname.startsWith(p))) {
            return NextResponse.redirect(new URL("/dashboard/warehouse/overview", req.url));
        }
    }

    // ── Rule 3: Sales Representative RBAC Limits ──
    if (role === "sales_rep") {
        const restrictedPaths = [
            "/dashboard/warehouse",
            "/dashboard/fleet",
            "/dashboard/settings",
            "/admin/super", // STRICT block from super admin
        ];
        if (restrictedPaths.some(p => pathname.startsWith(p))) {
            return NextResponse.redirect(new URL("/dashboard/sales/overview", req.url));
        }
    }

    // ── Rule 4: Client user trying to access Admin Area ──
    if (isAdminRoute && !isAnyAdmin) {
        return NextResponse.redirect(new URL("/dashboard/client/overview", req.url));
    }

    // ── Rule 5: Admin user trying to access Client Dashboard ──
    if (isDashboardRoute && isAnyAdmin) {
        if (role === "warehouse_manager" && pathname.startsWith("/dashboard/warehouse")) {
            return NextResponse.next();
        }
        if (role === "sales_rep" && pathname.startsWith("/dashboard/sales")) {
            return NextResponse.next();
        }

        if (role === "warehouse_manager") {
            return NextResponse.redirect(new URL("/dashboard/warehouse/overview", req.url));
        }
        if (role === "sales_rep" && !pathname.startsWith("/dashboard/sales")) {
            return NextResponse.redirect(new URL("/dashboard/sales/overview", req.url));
        }
        
        if (pathname === "/dashboard" || !pathname.startsWith("/admin")) {
            return NextResponse.redirect(new URL("/admin", req.url));
        }
    }

    // ── Rule 6: Client RBAC Isolation ──
    if (isDashboardRoute && role === "client") {
        // Force all dashboard traffic for clients into the /dashboard/client prefix
        if (!pathname.startsWith("/dashboard/client")) {
            return NextResponse.redirect(new URL("/dashboard/client/overview", req.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/admin/:path*",
        "/dashboard/:path*",
    ],
};
