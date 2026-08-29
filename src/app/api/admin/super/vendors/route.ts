import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, vendors, vendorDocuments, vendorCommercialTerms, systemLogs } from "@/lib/db/schema";
import { eq, desc, and, inArray } from "drizzle-orm";
import { requireAdmin } from "@/lib/requireAdmin";
import { VENDOR_STATUS, DOCUMENT_STATUS, USER_ROLES } from "@/lib/constants";
import { isValidVendorTransition, logVendorLifecycleEvent } from "@/lib/vendor-lifecycle";
import { v4 as uuid } from "uuid";

export async function GET(req: NextRequest) {
    try {
        const { user: currentUser, error } = await requireAdmin([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]);
        if (error) return error;

        const { searchParams } = new URL(req.url);
        const statusFilter = searchParams.get("status");

        // Fetch vendors alongside their admin user, KYC documents, and commercial terms
        const vendorList = await db.query.vendors.findMany({
            where: statusFilter && statusFilter !== "all" 
                ? eq(vendors.lifecycleStatus, statusFilter)
                : undefined,
            with: {
                user: {
                    columns: {
                        id: true,
                        name: true,
                        email: true,
                        phoneNumber: true,
                        status: true,
                        role: true,
                    },
                },
                documents: true,
                commercialTerms: {
                    orderBy: (terms, { desc }) => [desc(terms.version)],
                },
            },
            orderBy: (vendors, { desc }) => [desc(vendors.createdAt)],
        });

        return NextResponse.json(vendorList);
    } catch (e: any) {
        console.error("Super Admin Vendors GET Error:", e);
        return NextResponse.json({ error: e.message || "Internal Server Error" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const { user: currentUser, error } = await requireAdmin([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]);
        if (error) return error;

        const body = await req.json();
        const { 
            vendorId, 
            action, // approve | request_changes | reject | suspend | reactivate | offboard | update_terms | verify_doc
            reason, 
            commissionType,
            commissionValue,
            paymentTerms,
            documentId,
            documentStatus,
            reviewerNotes
        } = body;

        if (!vendorId) {
            return NextResponse.json({ error: "Vendor ID is required." }, { status: 400 });
        }

        const vendor = await db.query.vendors.findFirst({
            where: eq(vendors.id, vendorId),
            with: { user: true, commercialTerms: true },
        });

        if (!vendor) {
            return NextResponse.json({ error: "Vendor not found." }, { status: 404 });
        }

        const now = new Date();

        // ─── ACTION: VERIFY / REJECT A DOCUMENT ───
        if (action === "verify_doc") {
            if (!documentId || !documentStatus) {
                return NextResponse.json({ error: "documentId and documentStatus required" }, { status: 400 });
            }

            await db.update(vendorDocuments)
                .set({
                    status: documentStatus,
                    reviewerId: currentUser.id,
                    reviewerNotes: reviewerNotes || null,
                    rejectionReason: documentStatus === DOCUMENT_STATUS.REJECTED ? (reason || "Document declined") : null,
                    verifiedAt: documentStatus === DOCUMENT_STATUS.VERIFIED ? now : null,
                    updatedAt: now,
                })
                .where(eq(vendorDocuments.id, documentId));

            return NextResponse.json({ success: true, message: `Document status updated to ${documentStatus}.` });
        }

        // ─── ACTION: APPROVE VENDOR APPLICATION ───
        if (action === "approve") {
            await db.transaction(async (tx) => {
                // 1. Update Vendor Status to approved / active
                await tx.update(vendors)
                    .set({
                        lifecycleStatus: VENDOR_STATUS.APPROVED,
                        kycStatus: "verified",
                        agreementStatus: "signed",
                        approvedAt: now,
                        approvedBy: currentUser.id,
                        commissionType: commissionType || vendor.commissionType || "percentage",
                        commissionValue: commissionValue ? Number(commissionValue) : (vendor.commissionValue || 20),
                        paymentTerms: paymentTerms || vendor.paymentTerms || "Net 30 Days",
                        storeStatus: "active",
                        updatedAt: now,
                    })
                    .where(eq(vendors.id, vendorId));

                // 2. Elevate User Account to Vendor Role (Portal Activation!)
                if (vendor.userId) {
                    await tx.update(users)
                        .set({
                            role: USER_ROLES.VENDOR,
                            vendorId: vendor.id,
                            status: "active",
                            updatedAt: now,
                        })
                        .where(eq(users.id, vendor.userId));
                }

                // 3. Create or Activate Commercial Terms Record
                const latestTerm = vendor.commercialTerms?.[0];
                const nextVersion = (latestTerm?.version || 0) + 1;

                await tx.insert(vendorCommercialTerms).values({
                    id: uuid(),
                    vendorId: vendor.id,
                    version: nextVersion,
                    commissionType: commissionType || vendor.commissionType || "percentage",
                    commissionValue: commissionValue ? Number(commissionValue) : (vendor.commissionValue || 20),
                    payoutTerms: paymentTerms || vendor.paymentTerms || "Net 30 Days",
                    approvedBy: currentUser.id,
                    status: "active",
                    effectiveDate: now,
                    createdAt: now,
                });

                // 4. Log Lifecycle Audit
                await logVendorLifecycleEvent({
                    actorId: currentUser.id,
                    vendorId: vendor.id,
                    companyName: vendor.companyName,
                    fromStatus: vendor.lifecycleStatus,
                    toStatus: VENDOR_STATUS.APPROVED,
                    role: currentUser.role,
                    reason: `Approved by ${currentUser.name}. Portal access activated.`,
                });
            });

            return NextResponse.json({ success: true, message: `Vendor ${vendor.companyName} approved successfully.` });
        }

        // ─── ACTION: REQUEST CHANGES ───
        if (action === "request_changes") {
            if (!reason?.trim()) {
                return NextResponse.json({ error: "Please provide actionable feedback for the vendor." }, { status: 400 });
            }

            await db.transaction(async (tx) => {
                await tx.update(vendors)
                    .set({
                        lifecycleStatus: VENDOR_STATUS.CHANGES_REQUESTED,
                        changesRequestedReason: reason.trim(),
                        updatedAt: now,
                    })
                    .where(eq(vendors.id, vendorId));

                await logVendorLifecycleEvent({
                    actorId: currentUser.id,
                    vendorId: vendor.id,
                    companyName: vendor.companyName,
                    fromStatus: vendor.lifecycleStatus,
                    toStatus: VENDOR_STATUS.CHANGES_REQUESTED,
                    role: currentUser.role,
                    reason: reason.trim(),
                });
            });

            return NextResponse.json({ success: true, message: "Change request sent to vendor." });
        }

        // ─── ACTION: REJECT APPLICATION ───
        if (action === "reject") {
            if (!reason?.trim()) {
                return NextResponse.json({ error: "Rejection reason is required." }, { status: 400 });
            }

            await db.transaction(async (tx) => {
                await tx.update(vendors)
                    .set({
                        lifecycleStatus: VENDOR_STATUS.REJECTED,
                        rejectionReason: reason.trim(),
                        storeStatus: "offline",
                        updatedAt: now,
                    })
                    .where(eq(vendors.id, vendorId));

                await logVendorLifecycleEvent({
                    actorId: currentUser.id,
                    vendorId: vendor.id,
                    companyName: vendor.companyName,
                    fromStatus: vendor.lifecycleStatus,
                    toStatus: VENDOR_STATUS.REJECTED,
                    role: currentUser.role,
                    reason: reason.trim(),
                });
            });

            return NextResponse.json({ success: true, message: "Application rejected." });
        }

        // ─── ACTION: SUSPEND VENDOR ───
        if (action === "suspend") {
            if (!reason?.trim()) {
                return NextResponse.json({ error: "Suspension reason is required." }, { status: 400 });
            }

            await db.transaction(async (tx) => {
                await tx.update(vendors)
                    .set({
                        lifecycleStatus: VENDOR_STATUS.SUSPENDED,
                        suspensionReason: reason.trim(),
                        storeStatus: "offline",
                        updatedAt: now,
                    })
                    .where(eq(vendors.id, vendorId));

                await logVendorLifecycleEvent({
                    actorId: currentUser.id,
                    vendorId: vendor.id,
                    companyName: vendor.companyName,
                    fromStatus: vendor.lifecycleStatus,
                    toStatus: VENDOR_STATUS.SUSPENDED,
                    role: currentUser.role,
                    reason: reason.trim(),
                });
            });

            return NextResponse.json({ success: true, message: `Vendor ${vendor.companyName} suspended.` });
        }

        // ─── ACTION: REACTIVATE VENDOR ───
        if (action === "reactivate") {
            await db.transaction(async (tx) => {
                await tx.update(vendors)
                    .set({
                        lifecycleStatus: VENDOR_STATUS.ACTIVE,
                        suspensionReason: null,
                        storeStatus: "active",
                        updatedAt: now,
                    })
                    .where(eq(vendors.id, vendorId));

                await logVendorLifecycleEvent({
                    actorId: currentUser.id,
                    vendorId: vendor.id,
                    companyName: vendor.companyName,
                    fromStatus: vendor.lifecycleStatus,
                    toStatus: VENDOR_STATUS.ACTIVE,
                    role: currentUser.role,
                    reason: "Reactivated by admin",
                });
            });

            return NextResponse.json({ success: true, message: `Vendor ${vendor.companyName} reactivated.` });
        }

        return NextResponse.json({ error: "Unrecognized vendor action" }, { status: 400 });

    } catch (e: any) {
        console.error("Super Admin Vendors PATCH Error:", e);
        return NextResponse.json({ error: e.message || "Internal Server Error" }, { status: 500 });
    }
}
