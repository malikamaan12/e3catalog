import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bookings, products, vendors, productMedia } from "@/lib/db/schema";
import { eq, or, and, isNull } from "drizzle-orm";
import { requireAdmin } from "@/lib/requireAdmin";
import { renderToStream } from "@react-pdf/renderer";
import { QuotePDFTemplate } from "@/components/pdf/QuotePDFTemplate";
import React from "react";
import { format } from "date-fns";
import { Resend } from "resend";
import { getAllSiteSettings } from "@/lib/settings";
import { calculateTax } from "@/lib/finances";
import { USER_ROLES, BOOKING_STATUS, COMMISSION_TYPE } from "@/lib/constants";

const getAbsoluteUrl = (url: string | null | undefined, settings?: any) => {
    if (!url) return undefined;
    if (url.startsWith("http")) return url;
    const baseUrl = settings?.base_production_url || process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || "https://e3catalog.com";
    return `${baseUrl.replace(/\/$/, "")}${url.startsWith("/") ? url : `/${url}`}`;
};

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
    const chunks: Buffer[] = [];
    return new Promise((resolve, reject) => {
        stream.on("data", (chunk: any) => chunks.push(Buffer.from(chunk)));
        stream.on("error", (err: any) => reject(err));
        stream.on("end", () => resolve(Buffer.concat(chunks)));
    });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const settings = await getAllSiteSettings();
        const { error } = await requireAdmin([USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.VENDOR, USER_ROLES.SALES_REP]);
        if (error) return error;

        const resolvedParams = await params;
        const bookingId = resolvedParams.id;
        const body = await req.json();
        const { customNotes, termsAndConditions } = body;

        const booking = await db.query.bookings.findFirst({
            where: or(eq(bookings.id, bookingId), eq(bookings.projectId, bookingId)),
        });

        if (!booking) {
            return NextResponse.json({ error: "Booking/Quote not found" }, { status: 404 });
        }

        const siblingBookings = booking.projectId
            ? await db.select().from(bookings).where(eq(bookings.projectId, booking.projectId))
            : [booking];

        const hydratedItems = await Promise.all(
            siblingBookings.map(async (b: any) => {
                const product = await db.query.products.findFirst({ 
                    where: eq(products.id, b.productId),
                    with: {
                        productTags: { with: { tag: true } },
                        safetyCertificates: true
                    }
                });
                const media = await db.query.productMedia.findFirst({ where: eq(productMedia.productId, b.productId) });

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
                    thumbnailUrl: getAbsoluteUrl(media?.url || product?.thumbnailUrl, settings),
                    quantity: b.units,
                    startDate: format(startDate, "dd MMM yyyy"),
                    endDate: format(endDate, "dd MMM yyyy"),
                    pricePerDay,
                    totalLinePrice: lineTotal,
                    vendorId: product?.vendorId,
                    smartTags: product?.productTags?.map((pt: any) => pt.tag.name) || [],
                    certifications: product?.safetyCertificates?.map((sc: any) => sc.name) || [],
                    qrCodeUrl: product ? `${settings.qr_code_provider_url || 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data='}${encodeURIComponent(getAbsoluteUrl(`/${product.slug}`, settings) || "")}` : undefined,
                    modelLink: `View ${settings.platform_name} 3D Model`
                };
            })
        );

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
                primaryVendorHeader = getAbsoluteUrl(vProfile.letterheadHeaderUrl, settings);
                primaryVendorFooter = getAbsoluteUrl(vProfile.letterheadFooterUrl, settings);
                
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

        const subtotal = hydratedItems.reduce((acc: number, i: any) => acc + i.totalLinePrice, 0);
        const discountPct = booking.discount || 0;
        const discountAmount = subtotal * (discountPct / 100);
        const logistics = booking.logisticsCost || 0;
        const taxAmount = await calculateTax(subtotal - discountAmount + logistics);
        const grandTotal = subtotal - discountAmount + logistics + taxAmount;

        const quoteNumber = booking.id.slice(0, 8).toUpperCase();
        
        const props = {
            quoteNumber,
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
                tax: taxAmount,
                grandTotal: booking.totalPrice || grandTotal,
            },
            currencySymbol: settings.currency_symbol,
            platformName: settings.platform_name,
            footerLegalText: settings.footer_legal_text,
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

        const stream = await renderToStream(React.createElement(QuotePDFTemplate, props as any));
        const pdfBuffer = await streamToBuffer(stream as any);

        if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === "re_placeholder") {
            return NextResponse.json({ error: "Resend API key missing or invalid." }, { status: 500 });
        }

        const resend = new Resend(process.env.RESEND_API_KEY);
        const EMAIL_FROM = settings.resend_from_email || process.env.EMAIL_FROM || "";

        await resend.emails.send({
            from: EMAIL_FROM,
            to: booking.customerEmail,
            subject: `Official Quote #${quoteNumber} - ${booking.projectName || settings.platform_name}`,
            html: `<p>Hi ${booking.customerName},</p><p>Please find attached your official quote/proposal ${quoteNumber} for your review.</p><p>Thank you.</p><p>— The ${settings.platform_name} Team</p>`,
            attachments: [
                {
                    filename: `Quote-${quoteNumber}.pdf`,
                    content: pdfBuffer,
                }
            ]
        });

        // Update DB status to quote_sent
        await db.update(bookings)
            .set({ status: BOOKING_STATUS.QUOTE_SENT })
            .where(eq(bookings.id, bookingId));

        return NextResponse.json({ success: true, message: "Quote sent successfully" });

    } catch (error: any) {
        console.error("PDF Dispatch Error:", error?.message || error);
        return NextResponse.json({ error: "Failed to dispatch PDF quote", detail: error?.message }, { status: 500 });
    }
}
