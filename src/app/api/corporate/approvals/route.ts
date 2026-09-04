import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bookingApprovalRequests, bookings, clientOrganizations, organizationMembers } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/requireAdmin";
import { USER_ROLES } from "@/lib/constants";
import { eq, or, desc, and } from "drizzle-orm";
import { v4 as uuid } from "uuid";

export async function GET(req: NextRequest) {
    const { user, error } = await requireAdmin([
        USER_ROLES.CLIENT,
        USER_ROLES.ADMIN,
        USER_ROLES.SUPER_ADMIN,
    ]);
    if (error) return error;

    try {
        const url = new URL(req.url);
        let orgId = url.searchParams.get("orgId");

        if (!orgId) {
            const userMembership = await db.query.organizationMembers.findFirst({
                where: eq(organizationMembers.userId, user.id),
            });
            orgId = userMembership?.organizationId || null;
        }

        if (!orgId) {
            return NextResponse.json({ requests: [] });
        }

        const requests = await db.query.bookingApprovalRequests.findMany({
            where: eq(bookingApprovalRequests.organizationId, orgId),
            with: {
                booking: true,
                costCenter: true,
                requestedBy: {
                    columns: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                approver: {
                    columns: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
            orderBy: [desc(bookingApprovalRequests.createdAt)],
        });

        return NextResponse.json({ requests });
    } catch (e: any) {
        console.error("GET /api/corporate/approvals error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const { user, error } = await requireAdmin([
        USER_ROLES.CLIENT,
        USER_ROLES.ADMIN,
        USER_ROLES.SUPER_ADMIN,
    ]);
    if (error) return error;

    try {
        const body = await req.json();
        const { bookingId, costCenterId, notes } = body;

        if (!bookingId) {
            return NextResponse.json({ error: "Booking ID is required" }, { status: 400 });
        }

        // 1. Fetch user's organization membership
        const membership = await db.query.organizationMembers.findFirst({
            where: eq(organizationMembers.userId, user.id),
            with: { organization: true },
        });

        if (!membership || !membership.organization) {
            return NextResponse.json({ error: "User is not affiliated with any corporate organization." }, { status: 400 });
        }

        const org = membership.organization;

        // 2. Fetch booking
        const booking = await db.query.bookings.findFirst({
            where: or(eq(bookings.id, bookingId), eq(bookings.projectId, bookingId)),
        });

        if (!booking) {
            return NextResponse.json({ error: "Booking not found." }, { status: 404 });
        }

        const bookingAmount = Number(booking.totalPrice) || 0;
        const thresholdTriggered = bookingAmount > Number(membership.spendLimitPerBooking) ||
                                  bookingAmount > Number(org.approvalThresholdAmount);

        // Check if there is an existing pending approval
        const existingReq = await db.query.bookingApprovalRequests.findFirst({
            where: and(
                eq(bookingApprovalRequests.bookingId, booking.id),
                eq(bookingApprovalRequests.status, "pending")
            ),
        });

        if (existingReq) {
            return NextResponse.json({
                success: true,
                message: "Approval request is already pending.",
                approvalRequest: existingReq,
            });
        }

        const requestId = uuid();
        await db.insert(bookingApprovalRequests).values({
            id: requestId,
            bookingId: booking.id,
            organizationId: org.id,
            costCenterId: costCenterId || null,
            requestedById: user.id,
            amount: bookingAmount,
            thresholdTriggered,
            status: "pending",
            notes: notes || "Submitted for corporate internal sign-off.",
        });

        // Update booking records with org context and pending approval status
        const projectId = booking.projectId || booking.id;
        await db.update(bookings)
            .set({
                organizationId: org.id,
                costCenterId: costCenterId || null,
                internalApprovalStatus: "pending_approval",
                updatedAt: new Date(),
            })
            .where(or(eq(bookings.id, projectId), eq(bookings.projectId, projectId)));

        const createdReq = await db.query.bookingApprovalRequests.findFirst({
            where: eq(bookingApprovalRequests.id, requestId),
            with: {
                booking: true,
                costCenter: true,
                requestedBy: true,
            },
        });

        return NextResponse.json({
            success: true,
            message: "Requisition submitted for corporate review.",
            approvalRequest: createdReq,
        });
    } catch (e: any) {
        console.error("POST /api/corporate/approvals error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
