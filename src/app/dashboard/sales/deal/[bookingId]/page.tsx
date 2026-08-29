import { db } from "@/lib/db";
import { bookings, chatMessages, products, users } from "@/lib/db/schema";
import { eq, or, asc, desc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import DealRoomClient from "./DealRoomClient";
import { USER_ROLES } from "@/lib/constants";
import { calculateQuoteFinancials } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export default async function DealRoomPage({ params }: { params: Promise<{ bookingId: string }> }) {
    const { bookingId } = await params;
    const currentUser = await getCurrentUser();
    if (!currentUser) redirect("/login");

    // Only authorized roles allowed
    if (![USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.SALES_REP, USER_ROLES.VENDOR].includes(currentUser.role as any)) {
        redirect("/dashboard");
    }

    // 1. Fetch all items matching this bookingId or projectId
    const bookingItems = await db.query.bookings.findMany({
        where: or(eq(bookings.id, bookingId), eq(bookings.projectId, bookingId)),
        with: {
            product: {
                columns: {
                    id: true,
                    name: true,
                    slug: true,
                    pricePerDay: true,
                    showPrice: true,
                    thumbnailUrl: true,
                    dimensions: true,
                    unit: true,
                    vendorId: true,
                    packagingFee: true,
                    handlingFee: true,
                    setupFee: true,
                },
                with: {
                    vendor: {
                        columns: {
                            id: true,
                            companyName: true,
                        },
                    },
                },
            },
        },
        orderBy: [asc(bookings.createdAt)],
    });

    if (!bookingItems || bookingItems.length === 0) {
        notFound();
    }

    const firstItem = bookingItems[0];
    const projectId = firstItem.projectId || firstItem.id;

    // 2. Fetch Chat History (match by projectId or bookingId)
    const messages = await db
        .select()
        .from(chatMessages)
        .where(
            or(
                eq(chatMessages.bookingId, firstItem.id),
                eq(chatMessages.projectId, projectId)
            )
        )
        .orderBy(asc(chatMessages.createdAt));

    // 3. Fetch Catalog Products for Add-Item Dropdown
    const catalogProducts = await db
        .select({
            id: products.id,
            name: products.name,
            slug: products.slug,
            pricePerDay: products.pricePerDay,
            thumbnailUrl: products.thumbnailUrl,
            unit: products.unit,
        })
        .from(products)
        .where(eq(products.isPublished, true))
        .limit(100);

    // 4. Calculate initial pricing snapshot
    const financials = calculateQuoteFinancials({
        items: bookingItems.map(b => ({
            id: b.id,
            productId: b.productId,
            name: b.product.name,
            units: b.units,
            pricePerDay: b.product.pricePerDay || 0,
            startDate: b.startDate,
            endDate: b.endDate,
            showPrice: b.product.showPrice !== false,
            packagingFee: b.product.packagingFee || 0,
            handlingFee: b.product.handlingFee || 0,
            setupFee: b.product.setupFee || 0,
            vendorId: b.product.vendorId,
        })),
        discountPercent: firstItem.discount || 0,
        logisticsCost: firstItem.logisticsCost || 0,
        laborCost: firstItem.laborCost || 0,
        additionalChargeName: firstItem.additionalChargeName,
        additionalChargeAmount: firstItem.additionalChargeAmount || 0,
        additionalChargeType: (firstItem.additionalChargeType as any) || "fixed",
    });

    const unifiedQuote = {
        id: firstItem.id,
        projectId,
        projectName: firstItem.projectName || "Standard Rental Proposal",
        status: firstItem.status,
        customerName: firstItem.customerName,
        customerEmail: firstItem.customerEmail,
        customerPhone: firstItem.customerPhone,
        userId: firstItem.userId,
        startDate: firstItem.startDate,
        endDate: firstItem.endDate,
        paymentTerms: firstItem.paymentTerms || "100% Advance",
        discount: firstItem.discount || 0,
        logisticsCost: firstItem.logisticsCost || 0,
        laborCost: firstItem.laborCost || 0,
        additionalChargeName: firstItem.additionalChargeName,
        additionalChargeAmount: firstItem.additionalChargeAmount || 0,
        additionalChargeType: firstItem.additionalChargeType || "fixed",
        adminNotes: firstItem.adminNotes || "",
        clientNotes: firstItem.clientNotes || "",
        items: bookingItems,
        financials,
    };

    return (
        <DealRoomClient 
            quote={unifiedQuote} 
            messages={messages} 
            catalogProducts={catalogProducts}
            currentUser={currentUser} 
        />
    );
}
