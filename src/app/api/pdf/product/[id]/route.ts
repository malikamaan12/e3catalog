import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products, flightCaseContents } from "@/lib/db/schema";
import { eq, or } from "drizzle-orm";
import { renderToStream } from "@react-pdf/renderer";
import React from "react";
import ProductSpecSheetPDF, { ProductSpecSheetData } from "@/components/pdf/ProductSpecSheetPDF";
import { format } from "date-fns";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const url = new URL(req.url);
        const formatParam = url.searchParams.get("format");

        const product = await db.query.products.findFirst({
            where: or(eq(products.id, id), eq(products.slug, id)),
            with: {
                category: true,
                vendor: true,
                media: { orderBy: (media, { asc }) => [asc(media.sortOrder)] },
                safetyCertificates: true,
                installationGuides: true,
                inventoryUnits: true,
            },
        });

        if (!product) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }

        // Fetch flight case assembly packaging if configured
        let flightCaseInfo: ProductSpecSheetData["product"]["flightCase"] = null;
        try {
            const caseContent = await db.query.flightCaseContents.findFirst({
                where: eq(flightCaseContents.productId, product.id),
                with: {
                    flightCase: true,
                },
            });
            if (caseContent && caseContent.flightCase) {
                flightCaseInfo = {
                    caseType: caseContent.flightCase.caseType || "Standard Flight Case",
                    unitsPerCase: 1,
                    dimensions: caseContent.flightCase.name || "Road Trunk Spec",
                    grossWeightKg: caseContent.flightCase.tareWeightKg || 25,
                };
            }
        } catch {
            // Optional flight case enrichment
        }

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || "https://rentals.e3qatar.com";
        const webUrl = `${baseUrl}/catalog/${product.slug}`;

        const totalUnits = product.inventoryUnits?.length || 1;
        const condition = product.inventoryUnits?.[0]?.conditionStatus || "excellent";

        const data: ProductSpecSheetData = {
            product: {
                id: product.id,
                name: product.name,
                slug: product.slug,
                brand: product.brand,
                model: product.model,
                itemCode: product.itemCode,
                shortDescription: product.shortDescription,
                description: product.description,
                dimensions: product.dimensions,
                weight: product.weight,
                powerRequirements: product.powerRequirements,
                materials: product.materials,
                pricePerDay: product.pricePerDay,
                pricePerHour: product.pricePerHour,
                priceType: product.priceType,
                unit: product.unit,
                minOrderQty: product.minOrderQty,
                installTime: product.installTime,
                dismantleTime: product.dismantleTime,
                cleaningTime: product.cleaningTime,
                manpower: product.manpower,
                tools: product.tools,
                condition,
                totalUnits,
                replacementValue: product.replacementValue,
                requiresLicense: product.requiresLicense,
                requiresApproval: product.requiresApproval,
                thumbnailUrl: product.thumbnailUrl || (product.media && product.media[0]?.url) || null,
                categoryName: product.category?.name || "Event Equipment",
                vendorName: product.vendor?.companyName || "E3 Rentals Fleet",
                vendorPhone: product.vendor?.phone,
                vendorEmail: product.vendor?.email,
                vendorAddress: product.vendor?.address,
                vendorCr: product.vendor?.tradeLicenseNumber,
                vendorTaxId: product.vendor?.taxId,
                safetyCertificates: product.safetyCertificates?.map(c => ({
                    certName: c.certName,
                    certNumber: c.certNumber,
                    issuingBody: c.issuingBody,
                    issueDate: c.issueDate ? format(new Date(c.issueDate), "yyyy-MM-dd") : null,
                    expiryDate: c.expiryDate ? format(new Date(c.expiryDate), "yyyy-MM-dd") : null,
                })),
                flightCase: flightCaseInfo,
            },
            generatedAt: format(new Date(), "MMMM do, yyyy"),
            webUrl,
        };

        if (formatParam === "json" || req.headers.get("accept")?.includes("application/json")) {
            return NextResponse.json({ success: true, data });
        }

        const stream = await renderToStream(React.createElement(ProductSpecSheetPDF, { data }) as any);

        const safeFilename = (product.slug || product.id).replace(/[^a-zA-Z0-9_-]/g, "_");
        return new NextResponse(stream as any, {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="SpecSheet-${safeFilename}.pdf"`,
            },
        });
    } catch (error: any) {
        console.error("Product Spec Sheet PDF generation error:", error);
        return NextResponse.json({ error: "Failed to generate spec sheet PDF", details: error?.message }, { status: 500 });
    }
}
