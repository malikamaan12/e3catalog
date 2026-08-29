import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vendors, vendorCommercialTerms, systemLogs } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAdmin } from "@/lib/requireAdmin";
import { USER_ROLES } from "@/lib/constants";
import { v4 as uuid } from "uuid";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { user, error } = await requireAdmin([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]);
        if (error) return error;

        const resolvedParams = await params;
        const vendorId = resolvedParams.id;
        
        const body = await req.json();
        const { commissionType, commissionValue, payoutTerms, specialConditions } = body;

        const allowedTypes = ["percentage", "fixed_per_item", "per_project_fee", "fixed_monthly"];
        
        if (!commissionType || !allowedTypes.includes(commissionType)) {
            return NextResponse.json({ error: "Invalid commission type." }, { status: 400 });
        }

        if (commissionValue === undefined || isNaN(Number(commissionValue))) {
            return NextResponse.json({ error: "Invalid commission value." }, { status: 400 });
        }

        const numericValue = Number(commissionValue);

        const vendor = await db.query.vendors.findFirst({
            where: eq(vendors.id, vendorId),
            with: {
                commercialTerms: {
                    orderBy: (terms, { desc }) => [desc(terms.version)],
                    limit: 1,
                },
            },
        });

        if (!vendor) {
            return NextResponse.json({ error: "Vendor not found." }, { status: 404 });
        }

        const latestVersion = vendor.commercialTerms?.[0]?.version || 0;
        const newVersion = latestVersion + 1;
        const now = new Date();

        await db.transaction(async (tx) => {
            // 1. Mark previous active terms as superseded
            await tx.update(vendorCommercialTerms)
                .set({ status: "superseded" })
                .where(eq(vendorCommercialTerms.vendorId, vendorId));

            // 2. Insert new versioned commercial terms record
            await tx.insert(vendorCommercialTerms).values({
                id: uuid(),
                vendorId,
                version: newVersion,
                commissionType,
                commissionValue: numericValue,
                payoutTerms: payoutTerms || vendor.paymentTerms || "Net 30 Days",
                specialConditions: specialConditions || null,
                approvedBy: user.id,
                status: "active",
                effectiveDate: now,
                createdAt: now,
            });

            // 3. Update vendor current pointer
            await tx.update(vendors)
                .set({ 
                    commissionType, 
                    commissionValue: numericValue,
                    paymentTerms: payoutTerms || vendor.paymentTerms || "Net 30 Days",
                    updatedAt: now,
                })
                .where(eq(vendors.id, vendorId));

            // 4. Audit Log
            await tx.insert(systemLogs).values({
                id: uuid(),
                adminId: user.id,
                action: `COMMERCIAL_TERMS:VERSION_${newVersion}`,
                targetId: vendorId,
                targetType: "vendor",
                details: JSON.stringify({
                    previousCommission: {
                        type: vendor.commissionType,
                        value: vendor.commissionValue,
                    },
                    newCommission: {
                        type: commissionType,
                        value: numericValue,
                    },
                    version: newVersion,
                }),
                createdAt: now,
            });
        });

        return NextResponse.json({ 
            success: true, 
            version: newVersion,
            commissionType, 
            commissionValue: numericValue,
            message: `Commercial terms updated to Version ${newVersion} with effective date ${now.toISOString()}.` 
        });

    } catch (err: any) {
        console.error("Failed to update commission rules:", err);
        return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
    }
}
