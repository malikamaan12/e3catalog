import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { 
    bookingApprovalRequests, 
    bookings, 
    clientOrganizations, 
    organizationCostCenters, 
    organizationMembers 
} from "@/lib/db/schema";
import { requireAdmin } from "@/lib/requireAdmin";
import { USER_ROLES } from "@/lib/constants";
import { eq, or, sql, and } from "drizzle-orm";

export async function PATCH(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { user, error } = await requireAdmin([
        USER_ROLES.CLIENT,
        USER_ROLES.ADMIN,
        USER_ROLES.SUPER_ADMIN,
    ]);
    if (error) return error;

    const { id: requestId } = await context.params;

    try {
        const body = await req.json();
        const { action, notes } = body; // action: "approve" | "reject"

        if (!action || !["approve", "reject"].includes(action)) {
            return NextResponse.json({ error: "Action must be either 'approve' or 'reject'" }, { status: 400 });
        }

        // 1. Fetch approval request
        const request = await db.query.bookingApprovalRequests.findFirst({
            where: eq(bookingApprovalRequests.id, requestId),
            with: {
                organization: true,
                costCenter: true,
                booking: true,
            },
        });

        if (!request) {
            return NextResponse.json({ error: "Approval request not found" }, { status: 404 });
        }

        if (request.status !== "pending") {
            return NextResponse.json({ error: `Request has already been ${request.status}` }, { status: 400 });
        }

        // 2. Validate user authority to approve for this organization
        const isPlatformAdmin = [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN].includes(user.role as any);
        if (!isPlatformAdmin) {
            const memberRecord = await db.query.organizationMembers.findFirst({
                where: and(
                    eq(organizationMembers.organizationId, request.organizationId),
                    eq(organizationMembers.userId, user.id)
                ),
            });

            if (!memberRecord || (!memberRecord.canApprove && memberRecord.role !== "org_admin")) {
                return NextResponse.json({ 
                    error: "Forbidden: You do not possess signing authority to approve corporate requisitions for this organization." 
                }, { status: 403 });
            }
        }

        const now = new Date();
        const bookingId = request.bookingId;
        const amount = Number(request.amount) || 0;

        if (action === "approve") {
            // Check organization credit limit if configured
            const org = request.organization;
            if (org && org.creditLimit) {
                const currentUsed = Number(org.creditUsed) || 0;
                const limit = Number(org.creditLimit);
                if (currentUsed + amount > limit) {
                    return NextResponse.json({
                        error: `Approval exceeds corporate credit line. Available credit: ${(limit - currentUsed).toLocaleString()} QAR, Order: ${amount.toLocaleString()} QAR.`
                    }, { status: 400 });
                }
            }

            // Check cost center budget if assigned
            if (request.costCenter) {
                const spent = Number(request.costCenter.allocatedSpent) || 0;
                const budget = Number(request.costCenter.budgetAmount) || 0;
                if (budget > 0 && spent + amount > budget) {
                    return NextResponse.json({
                        error: `Approval exceeds Cost Center (${request.costCenter.code}) remaining budget. Available: ${(budget - spent).toLocaleString()} QAR.`
                    }, { status: 400 });
                }
            }

            // Update request
            await db.update(bookingApprovalRequests)
                .set({
                    status: "approved",
                    approverId: user.id,
                    decidedAt: now,
                    notes: notes || request.notes,
                    updatedAt: now,
                })
                .where(eq(bookingApprovalRequests.id, requestId));

            // Update booking
            await db.update(bookings)
                .set({
                    internalApprovalStatus: "approved",
                    internalApprovedAt: now,
                    internalApprovedBy: user.id,
                    updatedAt: now,
                })
                .where(or(eq(bookings.id, bookingId), eq(bookings.projectId, bookingId)));

            // Update organization credit
            await db.update(clientOrganizations)
                .set({
                    creditUsed: sql`${clientOrganizations.creditUsed} + ${amount}`,
                    updatedAt: now,
                })
                .where(eq(clientOrganizations.id, request.organizationId));

            // Update cost center spent if applicable
            if (request.costCenterId) {
                await db.update(organizationCostCenters)
                    .set({
                        allocatedSpent: sql`${organizationCostCenters.allocatedSpent} + ${amount}`,
                        updatedAt: now,
                    })
                    .where(eq(organizationCostCenters.id, request.costCenterId));
            }

            return NextResponse.json({
                success: true,
                status: "approved",
                message: "Corporate requisition approved. Booking is unlocked for final fulfillment and signing.",
            });
        } else {
            // Reject action
            await db.update(bookingApprovalRequests)
                .set({
                    status: "rejected",
                    approverId: user.id,
                    decidedAt: now,
                    notes: notes || "Rejected by corporate authority.",
                    updatedAt: now,
                })
                .where(eq(bookingApprovalRequests.id, requestId));

            await db.update(bookings)
                .set({
                    internalApprovalStatus: "rejected",
                    updatedAt: now,
                })
                .where(or(eq(bookings.id, bookingId), eq(bookings.projectId, bookingId)));

            return NextResponse.json({
                success: true,
                status: "rejected",
                message: "Corporate requisition rejected.",
            });
        }
    } catch (e: any) {
        console.error("PATCH /api/corporate/approvals/[id] error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
