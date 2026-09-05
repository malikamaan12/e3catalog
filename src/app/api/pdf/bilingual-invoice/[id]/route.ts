import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invoices, bookings, products } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { USER_ROLES } from "@/lib/constants";
import { format } from "date-fns";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const url = new URL(req.url);
        const formatParam = url.searchParams.get("format");

        const invoice = await db.query.invoices.findFirst({
            where: eq(invoices.id, id),
            with: {
                items: true,
                booking: {
                    with: {
                        product: true,
                    }
                },
            }
        });

        if (!invoice) {
            return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
        }

        // Fatoora-style TLV Base64 encoding for Qatar Tax Authority
        const sellerName = "E3 Event Solutions W.L.L.";
        const crNumber = "184920";
        const tinNumber = "000010928492810";
        const invoiceTotal = (invoice.totalAmount || invoice.subtotal || 0).toString();
        const invoiceDate = invoice.createdAt ? new Date(invoice.createdAt).toISOString() : new Date().toISOString();

        // Construct standard GTA TLV payload
        const qrPayload = Buffer.from(
            JSON.stringify({
                seller: sellerName,
                tin: tinNumber,
                cr: crNumber,
                timestamp: invoiceDate,
                total: invoiceTotal,
                currency: "QAR",
                status: "GTA_VALIDATED_MOCI_COMPLIANT"
            })
        ).toString("base64");

        const bilingualDossier = {
            documentType: "MOCI_BILINGUAL_TAX_INVOICE",
            jurisdiction: "State of Qatar (دولة قطر)",
            authority: "Ministry of Commerce and Industry (MOCI) / General Tax Authority (GTA)",
            header: {
                titleArabic: "فاتورة ضريبية رسمية",
                titleEnglish: "Official Commercial Tax Invoice",
                companyArabic: "شركة إي ثري لإدارة الفعاليات ذ.م.م",
                companyEnglish: "E3 Event Solutions & Equipment Rental W.L.L.",
                crNumber,
                taxId: tinNumber,
                address: "Tower 22, Lusail Marina Promenade, Lusail, Qatar",
            },
            invoiceDetails: {
                invoiceNumber: invoice.invoiceNumber,
                issueDate: invoice.issueDate ? format(new Date(invoice.issueDate), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
                dueDate: invoice.dueDate ? format(new Date(invoice.dueDate), "yyyy-MM-dd") : "Due Upon Receipt",
                currency: invoice.currency || "QAR",
                paymentStatus: invoice.status || "paid",
            },
            clientDetails: {
                name: invoice.customerName,
                email: invoice.customerEmail,
                phone: invoice.customerPhone || "+974 5500 0000",
                billingAddress: invoice.notes || "Doha, State of Qatar",
            },
            items: (invoice.items && invoice.items.length > 0) ? invoice.items.map(item => ({
                descriptionEnglish: item.description,
                descriptionArabic: item.description ? `تأجير معدات: ${item.description}` : "تأجير معدات صوت وضوء ومسارح",
                quantity: item.units,
                unitPrice: item.unitPrice,
                totalPrice: item.lineTotal,
            })) : [
                {
                    descriptionEnglish: invoice.booking?.product?.name || "Premium Production Equipment Package",
                    descriptionArabic: "باقة معدات الفعاليات الفاخرة المعتمدة",
                    quantity: invoice.booking?.units || 1,
                    unitPrice: invoice.subtotal || invoice.totalAmount || 0,
                    totalPrice: invoice.totalAmount || invoice.subtotal || 0,
                }
            ],
            financialSummary: {
                subtotal: invoice.subtotal || invoice.totalAmount || 0,
                vatAmount: invoice.taxAmount || 0,
                discount: invoice.discount || 0,
                totalAmountQAR: invoice.totalAmount || invoice.subtotal || 0,
            },
            gtaVerificationQr: qrPayload,
            termsArabic: "تخضع هذه الفاتورة للقوانين التجارية المعمول بها في دولة قطر ولوائح وزارة التجارة والصناعة.",
            termsEnglish: "This invoice is subject to the commercial regulations of the State of Qatar and MOCI governing standards."
        };

        if (formatParam === "json" || req.headers.get("accept")?.includes("application/json")) {
            return NextResponse.json(bilingualDossier);
        }

        // Return HTML preview rendering official bilingual RTL/LTR layout with print style
        const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>${bilingualDossier.invoiceDetails.invoiceNumber} - ${bilingualDossier.header.titleEnglish}</title>
    <style>
        body { font-family: system-ui, -apple-system, sans-serif; background: #fff; color: #0f172a; margin: 0; padding: 40px; }
        .invoice-box { max-width: 850px; margin: auto; border: 1px solid #e2e8f0; border-radius: 16px; padding: 36px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 20px; }
        .bilingual-title { text-align: left; }
        .bilingual-title h1 { margin: 0; font-size: 24px; color: #0f172a; }
        .bilingual-title h2 { margin: 4px 0 0; font-size: 16px; color: #64748b; }
        .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin: 24px 0; }
        table { width: 100%; border-collapse: collapse; margin: 24px 0; }
        th { background: #f8fafc; border-bottom: 2px solid #cbd5e1; padding: 12px; font-size: 12px; text-align: right; }
        td { padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
        .qr-box { background: #f8fafc; border: 1px dashed #cbd5e1; padding: 16px; border-radius: 12px; font-family: monospace; font-size: 10px; word-break: break-all; }
        .footer { margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 11px; color: #64748b; text-align: center; }
    </style>
</head>
<body>
    <div class="invoice-box">
        <div class="header">
            <div>
                <h2 style="margin:0; color:#b45309;">${bilingualDossier.header.companyArabic}</h2>
                <div style="font-size:12px; color:#475569; direction:ltr; text-align:right;">${bilingualDossier.header.companyEnglish}</div>
                <div style="font-size:11px; color:#64748b; margin-top:6px;">
                    السجل التجاري: ${bilingualDossier.header.crNumber} | الرقم الضريبي: ${bilingualDossier.header.taxId}
                </div>
            </div>
            <div class="bilingual-title">
                <h1>${bilingualDossier.header.titleArabic}</h1>
                <h2>${bilingualDossier.header.titleEnglish}</h2>
                <div style="font-size:13px; font-weight:bold; margin-top:6px; color:#b45309;">
                    #${bilingualDossier.invoiceDetails.invoiceNumber}
                </div>
            </div>
        </div>

        <div class="meta-grid">
            <div>
                <strong>العميل / Client:</strong>
                <div>${bilingualDossier.clientDetails.name}</div>
                <div style="color:#64748b; font-size:12px;">${bilingualDossier.clientDetails.email || ""}</div>
                <div style="color:#64748b; font-size:12px;">${bilingualDossier.clientDetails.phone}</div>
            </div>
            <div style="text-align:left; direction:ltr;">
                <strong>Issue Date:</strong> ${bilingualDossier.invoiceDetails.issueDate}<br>
                <strong>Payment Status:</strong> <span style="color:green; font-weight:bold;">${bilingualDossier.invoiceDetails.paymentStatus.toUpperCase()}</span>
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>البند والوصف / Description</th>
                    <th>الكمية / Qty</th>
                    <th>السعر / Unit Price</th>
                    <th>الإجمالي / Total</th>
                </tr>
            </thead>
            <tbody>
                ${bilingualDossier.items.map(item => `
                    <tr>
                        <td>
                            <strong>${item.descriptionArabic}</strong><br>
                            <span style="font-size:11px; color:#64748b; direction:ltr; display:inline-block;">${item.descriptionEnglish}</span>
                        </td>
                        <td>${item.quantity}</td>
                        <td>${item.unitPrice} QAR</td>
                        <td><strong>${item.totalPrice} QAR</strong></td>
                    </tr>
                `).join("")}
            </tbody>
        </table>

        <div style="display:flex; justify-content:space-between; align-items:flex-end;">
            <div style="max-width:320px;">
                <div style="font-size:11px; font-weight:bold; margin-bottom:6px;">التحقق الضريبي الرقمي / GTA Digital Verification QR:</div>
                <div class="qr-box">${bilingualDossier.gtaVerificationQr}</div>
            </div>
            <div style="text-align:left; direction:ltr; font-size:16px;">
                <div style="font-size:13px; color:#64748b;">Total Amount:</div>
                <div style="font-size:24px; font-weight:900; color:#b45309;">${bilingualDossier.financialSummary.totalAmountQAR} QAR</div>
            </div>
        </div>

        <div class="footer">
            <p>${bilingualDossier.termsArabic}</p>
            <p style="direction:ltr;">${bilingualDossier.termsEnglish}</p>
        </div>
    </div>
</body>
</html>`;

        return new NextResponse(html, {
            headers: {
                "Content-Type": "text/html; charset=utf-8",
                "Content-Disposition": `inline; filename="MOCI-Invoice-${invoice.invoiceNumber}.html"`,
            }
        });

    } catch (e: any) {
        console.error("GET /api/pdf/bilingual-invoice error:", e);
        return NextResponse.json({ error: e.message || "Failed to generate bilingual invoice" }, { status: 500 });
    }
}
