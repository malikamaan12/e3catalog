import { db } from "@/lib/db";
import { vendors, products, inventoryUnits, vendorLedgers, vendorDocuments } from "@/lib/db/schema";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { eq, and, sql } from "drizzle-orm";
import { USER_ROLES, ASSET_STATUS, PRODUCT_STATUS } from "@/lib/constants";

export async function GET() {
    try {
        const { user, error } = await requireAdmin([USER_ROLES.VENDOR, USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]);
        if (error) return error;

        const vendorId = (user as any).vendorId;
        if (!vendorId) {
            return NextResponse.json({ error: "No vendor profile attached to this user." }, { status: 403 });
        }

        const vendorProfile = await db.query.vendors.findFirst({
            where: eq(vendors.id, vendorId),
            with: {
                documents: true,
                commercialTerms: {
                    orderBy: (terms, { desc }) => [desc(terms.version)],
                    limit: 1,
                },
            },
        });

        if (!vendorProfile) {
            return NextResponse.json({ error: "Vendor profile not found" }, { status: 404 });
        }

        // 1. Authoritative Product Aggregates
        const allProducts = await db.query.products.findMany({
            where: eq(products.vendorId, vendorId),
            columns: { id: true, status: true, isPublished: true },
        });

        const totalProducts = allProducts.length;
        const publishedProducts = allProducts.filter(p => p.status === PRODUCT_STATUS.PUBLISHED || p.isPublished).length;
        const pendingReviewProducts = allProducts.filter(p => p.status === PRODUCT_STATUS.PENDING_REVIEW).length;
        const draftProducts = allProducts.filter(p => p.status === PRODUCT_STATUS.DRAFT).length;

        // 2. Authoritative Fleet Inventory Aggregates
        const allUnits = await db.query.inventoryUnits.findMany({
            where: eq(inventoryUnits.vendorId, vendorId),
            columns: { id: true, availabilityStatus: true, conditionStatus: true },
        });

        const totalUnits = allUnits.length;
        const inWarehouseUnits = allUnits.filter(u => u.availabilityStatus === ASSET_STATUS.IN_WAREHOUSE).length;
        const onRentUnits = allUnits.filter(u => u.availabilityStatus === ASSET_STATUS.ON_RENT).length;
        const inMaintenanceUnits = allUnits.filter(u => u.availabilityStatus === ASSET_STATUS.IN_MAINTENANCE || u.availabilityStatus === ASSET_STATUS.DAMAGED_HOLD).length;

        // 3. Authoritative Financial Ledger Aggregates
        const ledgers = await db.query.vendorLedgers.findMany({
            where: eq(vendorLedgers.vendorId, vendorId),
        });

        const grossRevenue = ledgers.reduce((acc, l) => acc + (l.amount || 0), 0);
        const platformFees = ledgers.reduce((acc, l) => acc + (l.platformFee || 0), 0);
        const netPayouts = ledgers.reduce((acc, l) => acc + (l.vendorPayout || 0), 0);
        const pendingPayouts = ledgers
            .filter(l => l.status === "pending_payout")
            .reduce((acc, l) => acc + (l.vendorPayout || 0), 0);

        return NextResponse.json({
            vendor: vendorProfile,
            stats: {
                products: {
                    total: totalProducts,
                    published: publishedProducts,
                    pendingReview: pendingReviewProducts,
                    draft: draftProducts,
                },
                fleet: {
                    total: totalUnits,
                    available: inWarehouseUnits,
                    onRent: onRentUnits,
                    maintenance: inMaintenanceUnits,
                },
                financials: {
                    grossRevenue,
                    platformFees,
                    netPayouts,
                    pendingPayouts,
                    commissionType: vendorProfile.commissionType,
                    commissionValue: vendorProfile.commissionValue,
                },
            },
        });

    } catch (err: any) {
        console.error("GET /api/vendors/me error:", err);
        return NextResponse.json({ error: "Failed to fetch vendor statistics" }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const { user, error } = await requireAdmin([USER_ROLES.VENDOR, USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]);
        if (error) return error;

        const vendorId = (user as any).vendorId;
        if (!vendorId) {
            return NextResponse.json({ error: "No vendor profile attached to this user." }, { status: 403 });
        }

        const body = await req.json();
        const { 
            tradingName,
            brandStory,
            logoUrl,
            bannerUrl,
            phone,
            website,
            address,
            city,
            letterheadHeaderUrl, 
            letterheadFooterUrl,
            bankName,
            accountName,
            accountNumber,
            iban,
            swift
        } = body;

        await db.update(vendors)
            .set({
                tradingName: tradingName !== undefined ? tradingName : undefined,
                brandStory: brandStory !== undefined ? brandStory : undefined,
                logoUrl: logoUrl !== undefined ? logoUrl : undefined,
                bannerUrl: bannerUrl !== undefined ? bannerUrl : undefined,
                phone: phone !== undefined ? phone : undefined,
                website: website !== undefined ? website : undefined,
                address: address !== undefined ? address : undefined,
                city: city !== undefined ? city : undefined,
                letterheadHeaderUrl: letterheadHeaderUrl || null,
                letterheadFooterUrl: letterheadFooterUrl || null,
                bankName: bankName !== undefined ? bankName : undefined,
                accountName: accountName !== undefined ? accountName : undefined,
                accountNumber: accountNumber !== undefined ? accountNumber : undefined,
                iban: iban !== undefined ? iban : undefined,
                swift: swift !== undefined ? swift : undefined,
                updatedAt: new Date(),
            })
            .where(eq(vendors.id, vendorId));

        return NextResponse.json({ success: true, message: "Vendor profile updated successfully." });

    } catch (err: any) {
        console.error("PUT /api/vendors/me error:", err);
        return NextResponse.json({ error: "Failed to update vendor settings" }, { status: 500 });
    }
}
