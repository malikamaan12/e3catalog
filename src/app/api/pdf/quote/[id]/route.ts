import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bookings, products, vendors, productMedia } from "@/lib/db/schema";
import { eq, or, and, isNull } from "drizzle-orm";
import { requireAdmin } from "@/lib/requireAdmin";
import { getCurrentUser } from "@/lib/auth";
import { renderToStream } from "@react-pdf/renderer";
import { QuotePDFTemplate } from "@/components/pdf/QuotePDFTemplate";
import React from "react";
import { format } from "date-fns";

const getAbsoluteUrl = (url: string | null | undefined) => {
    if (!url) return undefined;
    if (url.startsWith("http")) return url;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || "https://e3catalog.com";
    return `${baseUrl.replace(/\/$/, "")}${url.startsWith("/") ? url : `/${url}`}`;
};

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { error } = await requireAdmin(["admin", "super_admin", "vendor", "sales_rep"]);
        if (error) return error;

        const resolvedParams = await params;
        const bookingId = resolvedParams.id;
        const body = await req.json();
        const { customNotes, termsAndConditions } = body;

        // 1. Fetch the primary Booking row (can be id or projectId)
        const booking = await db.query.bookings.findFirst({
            where: or(eq(bookings.id, bookingId), eq(bookings.projectId, bookingId)),
        });

        if (!booking) {
            return NextResponse.json({ error: "Booking/Quote not found" }, { status: 404 });
        }

        // 2. Fetch ALL booking rows in this project (each row = one line item in manual bookings)
        //    If there's no projectId, fall back to just this booking row as a single item.
        const siblingBookings = booking.projectId
            ? await db.select().from(bookings).where(eq(bookings.projectId, booking.projectId))
            : [booking];

        // 3. Hydrate each booking row with its product details
        const hydratedItems = await Promise.all(
            siblingBookings.map(async (b: any) => {
                const product = await db.query.products.findFirst({
                    where: eq(products.id, b.productId),
                });
                const media = await db.query.productMedia.findFirst({
                    where: eq(productMedia.productId, b.productId)
                });

                const startDate = new Date(b.startDate);
                const endDate = new Date(b.endDate);
                const days = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
                const pricePerDay = product?.pricePerDay || 0;
                const lineTotal = pricePerDay * b.units * days;

                return {
                    name: product?.name || "Unknown Item",
                    itemCode: product?.itemCode || "",
                    shortDescription: product?.shortDescription || "",
                    dimensions: product?.dimensions || "N/A",
                    weight: product?.weight || "N/A",
                    powerRequirements: product?.powerRequirements || "N/A",
                    thumbnailUrl: getAbsoluteUrl(media?.url || product?.thumbnailUrl),
                    quantity: b.units,
                    startDate: format(startDate, "dd MMM yyyy"),
                    endDate: format(endDate, "dd MMM yyyy"),
                    pricePerDay,
                    totalLinePrice: lineTotal,
                    vendorId: product?.vendorId,
                    smartTags: ["Premium Grade", "Inspected"], // Adding dummy tags for visual effect or swap with real ones if added to DB
                    certifications: ["TUV Certified"], // Same for certifications
                    qrCodeUrl: product ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(getAbsoluteUrl(`/catalog/${product.slug}`) || "")}` : undefined,
                    modelLink: "View 3D Model Online"
                };
            })
        );

        // 4. Optional: Detect primary vendor for letterhead and bank details
        let primaryVendorHeader = null;
        let primaryVendorFooter = null;
        let pBankDetails = null;
        let pPaymentTerms = null;

        const vendorIds = [...new Set(hydratedItems.map((i: any) => i.vendorId).filter(Boolean))];
        if (vendorIds.length === 1) {
            const vProfile = await db.query.vendors.findFirst({
                where: eq(vendors.id, vendorIds[0] as string)
            });
            if (vProfile) {
                primaryVendorHeader = getAbsoluteUrl(vProfile.letterheadHeaderUrl);
                primaryVendorFooter = getAbsoluteUrl(vProfile.letterheadFooterUrl);
                
                if (vProfile.bankName && vProfile.accountNumber) {
                    pBankDetails = {
                        bankName: vProfile.bankName,
                        accountName: vProfile.accountName || "",
                        accountNumber: vProfile.accountNumber,
                        iban: vProfile.iban || "",
                        swift: vProfile.swift || "",
                    };
                }
                pPaymentTerms = vProfile.paymentTerms || null;
            }
        }

        // 5. Build financials from actual line totals
        const subtotal = hydratedItems.reduce((acc: number, i: any) => acc + i.totalLinePrice, 0);
        const discountPct = booking.discount || 0;
        const discountAmount = subtotal * (discountPct / 100);
        const logistics = booking.logisticsCost || 0;
        const grandTotal = subtotal - discountAmount + logistics;

        const props = {
            quoteNumber: booking.id.slice(0, 8).toUpperCase(),
            date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
            clientName: booking.customerName,
            clientEmail: booking.customerEmail,
            clientPhone: booking.customerPhone || undefined,
            eventProjectName: booking.projectName || undefined,
            letterheadHeaderUrl: primaryVendorHeader,
            letterheadFooterUrl: primaryVendorFooter,
            items: hydratedItems,
            financials: {
                subtotal,
                logisticsCost: logistics,
                setupLaborCost: booking.laborCost || 0,
                discount: discountPct,
                tax: 0,
                grandTotal: booking.totalPrice || grandTotal,
            },
            bankDetails: pBankDetails,
            paymentTerms: pPaymentTerms,
            termsAndConditions: termsAndConditions || [
                "Strictly 100% advance payment required to confirm booking.",
                "Any damages to the equipment will be charged at full replacement value.",
                "Delivery will only commence post fund clearance.",
                "Valid for 7 days."
            ],
            customNotes: customNotes || booking.notes || undefined
        };

        // 6. Render PDF Stream
        const stream = await renderToStream(React.createElement(QuotePDFTemplate, props as any));

        return new NextResponse(stream as any, {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="Quote-${props.quoteNumber}.pdf"`
            }
        });

    } catch (error: any) {
        console.error("PDF Generation Error:", error?.message || error);
        return NextResponse.json({ error: "Failed to generate PDF", detail: error?.message }, { status: 500 });
    }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        // const user = await getCurrentUser();
        // Allow if user is admin or the owner
        // if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        
        // Mock user for testing
        const user = { id: "test", role: "super_admin" };

        const resolvedParams = await params;
        const rawId = resolvedParams.id;
        let bookingId = rawId;
        let queryVendorId: string | undefined = undefined;

        if (rawId.includes("::")) {
            [bookingId, queryVendorId] = rawId.split("::");
        }

        const booking = await db.query.bookings.findFirst({
            where: or(eq(bookings.id, bookingId), eq(bookings.projectId, bookingId)),
        });

        if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

        // Security check for clients
        if (user.role === "client" && booking.userId !== user.id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const vendorFilter = queryVendorId
            ? (queryVendorId === "platform" ? isNull(bookings.vendorId) : eq(bookings.vendorId, queryVendorId))
            : undefined;

        const siblingBookings = booking.projectId
            ? await db.select().from(bookings).where(
                and(
                    eq(bookings.projectId, booking.projectId),
                    vendorFilter
                )
            )
            : [booking];

        const isPendingQuote = ["request", "pending_quote", "changes_requested"].includes(booking.status);

        const hydratedItems = await Promise.all(
            siblingBookings.map(async (b: any) => {
                const product = await db.query.products.findFirst({ where: eq(products.id, b.productId) });
                const media = await db.query.productMedia.findFirst({ where: eq(productMedia.productId, b.productId) });
                const start = new Date(b.startDate);
                const end = new Date(b.endDate);
                const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
                
                const showPrice = product?.showPrice !== false;
                const hidePrice = isPendingQuote || !showPrice;
                const pricePerDay = product?.pricePerDay || 0;
                const lineTotal = pricePerDay * b.units * days;

                return {
                    name: product?.name || "Unknown Item",
                    itemCode: product?.itemCode || "",
                    shortDescription: product?.shortDescription || "",
                    dimensions: product?.dimensions || "N/A",
                    weight: product?.weight || "N/A",
                    powerRequirements: product?.powerRequirements || "N/A",
                    thumbnailUrl: getAbsoluteUrl(media?.url || product?.thumbnailUrl),
                    quantity: b.units,
                    startDate: format(start, "dd MMM yyyy"),
                    endDate: format(end, "dd MMM yyyy"),
                    pricePerDay: hidePrice ? "TBD" : pricePerDay,
                    totalLinePrice: hidePrice ? "TBD" : lineTotal,
                    _rawLineTotal: showPrice ? lineTotal : 0, // For internal subtotal math
                    vendorId: product?.vendorId,
                    smartTags: ["Premium Grade", "Inspected"],
                    certifications: ["TUV Certified"],
                    qrCodeUrl: product ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(getAbsoluteUrl(`/catalog/${product.slug}`) || "")}` : undefined,
                    modelLink: "View 3D Model Online"
                };
            })
        );

        let primaryVendorHeader = null;
        let primaryVendorFooter = null;
        let pBankDetails = null;
        let pPaymentTerms = null;

        const vendorIds = [...new Set(hydratedItems.map((i: any) => i.vendorId).filter(Boolean))];
        if (vendorIds.length === 1) {
            const vProfile = await db.query.vendors.findFirst({ where: eq(vendors.id, vendorIds[0] as string) });
            if (vProfile) {
                primaryVendorHeader = getAbsoluteUrl(vProfile.letterheadHeaderUrl);
                primaryVendorFooter = getAbsoluteUrl(vProfile.letterheadFooterUrl);

                if (vProfile.bankName && vProfile.accountNumber) {
                    pBankDetails = {
                        bankName: vProfile.bankName,
                        accountName: vProfile.accountName || "",
                        accountNumber: vProfile.accountNumber,
                        iban: vProfile.iban || "",
                        swift: vProfile.swift || "",
                    };
                }
                pPaymentTerms = vProfile.paymentTerms || null;
            }
        }

        const subtotal = hydratedItems.reduce((acc, i) => acc + i._rawLineTotal, 0);
        const discountPct = booking.discount || 0;
        const logistics = booking.logisticsCost || 0;
        const grandTotal = subtotal - (subtotal * (discountPct / 100)) + logistics;

        const props = {
            quoteNumber: booking.id.slice(0, 8).toUpperCase(),
            date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
            clientName: booking.customerName,
            clientEmail: booking.customerEmail,
            clientPhone: booking.customerPhone || undefined,
            eventProjectName: booking.projectName || undefined,
            letterheadHeaderUrl: primaryVendorHeader,
            letterheadFooterUrl: primaryVendorFooter,
            items: hydratedItems,
            financials: {
                subtotal: isPendingQuote ? "TBD" : subtotal,
                logisticsCost: isPendingQuote ? "TBD" : logistics,
                setupLaborCost: isPendingQuote ? "TBD" : (booking.laborCost || 0),
                discount: discountPct,
                tax: 0,
                grandTotal: isPendingQuote ? "TBD" : (booking.totalPrice || grandTotal),
            },
            bankDetails: pBankDetails,
            paymentTerms: pPaymentTerms,
            termsAndConditions: [
                "Strictly 100% advance payment required to confirm booking.",
                "Any damages to the equipment will be charged at full replacement value.",
                "Delivery will only commence post fund clearance.",
                "Valid for 7 days."
            ]
        };

        const stream = await renderToStream(React.createElement(QuotePDFTemplate, props as any));
        return new NextResponse(stream as any, {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="Quote-${props.quoteNumber}.pdf"`
            }
        });
    } catch (error: any) {
        console.error("PDF GET Error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
