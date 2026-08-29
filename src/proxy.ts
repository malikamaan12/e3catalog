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

    const role = session.role || "client";

    // ── Rule 2: Super Admin Exclusive Routes ──
    if (pathname.startsWith("/admin/super") && role !== "super_admin") {
        if (["admin", "sales_rep", "warehouse_manager"].includes(role)) {
            return NextResponse.redirect(new URL("/admin", req.url));
        }
        return NextResponse.redirect(new URL("/login", req.url));
    }

    // ── Rule 3: Sensitive Financial, Billing & Vendor Management (Admin & SuperAdmin only) ──
    const isSensitiveAdminRoute = 
        pathname.startsWith("/admin/financials") ||
        pathname.startsWith("/admin/settings") ||
        pathname.startsWith("/admin/settlements") ||
        pathname.startsWith("/admin/vendors");

    if (isSensitiveAdminRoute && !["admin", "super_admin"].includes(role)) {
        if (role === "warehouse_manager") {
            return NextResponse.redirect(new URL("/dashboard/warehouse/overview", req.url));
        }
        if (role === "sales_rep") {
            return NextResponse.redirect(new URL("/dashboard/sales/overview", req.url));
        }
        if (role === "vendor") {
            return NextResponse.redirect(new URL("/dashboard", req.url));
        }
        return NextResponse.redirect(new URL("/dashboard/client/overview", req.url));
    }

    // ── Rule 4: Warehouse Manager Access Scope ──
    if (role === "warehouse_manager") {
        const allowedWarehousePaths = [
            "/dashboard/warehouse",
            "/admin/fulfillment",
            "/admin/fleet",
            "/admin/warehouses",
            "/passport"
        ];
        const isAllowed = allowedWarehousePaths.some(p => pathname.startsWith(p));
        if (!isAllowed) {
            return NextResponse.redirect(new URL("/dashboard/warehouse/overview", req.url));
        }
        return NextResponse.next();
    }

    // ── Rule 5: Sales Representative Access Scope ──
    if (role === "sales_rep") {
        const allowedSalesPaths = [
            "/dashboard/sales",
            "/admin/bookings",
            "/admin/calendar",
            "/admin/products",
            "/admin/chat"
        ];
        const isAllowed = allowedSalesPaths.some(p => pathname.startsWith(p));
        if (!isAllowed) {
            return NextResponse.redirect(new URL("/dashboard/sales/overview", req.url));
        }
        return NextResponse.next();
    }

    // ── Rule 6: Vendor Tenant Access Scope ──
    if (role === "vendor") {
        if (isAdminRoute) {
            return NextResponse.redirect(new URL("/dashboard", req.url));
        }
        if (pathname.startsWith("/dashboard/client") || pathname.startsWith("/dashboard/sales") || pathname.startsWith("/dashboard/warehouse")) {
            return NextResponse.redirect(new URL("/dashboard", req.url));
        }
        return NextResponse.next();
    }

    // ── Rule 7: Client Access Scope ──
    if (role === "client") {
        if (isAdminRoute) {
            return NextResponse.redirect(new URL("/dashboard/client/overview", req.url));
        }
        if (isDashboardRoute && !pathname.startsWith("/dashboard/client")) {
            return NextResponse.redirect(new URL("/dashboard/client/overview", req.url));
        }
        return NextResponse.next();
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/admin/:path*",
        "/dashboard/:path*",
    ],
};
