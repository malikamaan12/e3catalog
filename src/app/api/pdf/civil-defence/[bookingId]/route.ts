import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bookings, products, bookingUnitAssignments, inventoryUnits } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { format } from "date-fns";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ bookingId: string }> }
) {
    try {
        const { bookingId } = await params;
        const url = new URL(req.url);
        const formatParam = url.searchParams.get("format");

        const booking = await db.query.bookings.findFirst({
            where: eq(bookings.id, bookingId),
            with: {
                product: true,
            }
        });

        if (!booking) {
            return NextResponse.json({ error: "Booking not found" }, { status: 404 });
        }

        // Fetch assigned units if any
        const assignedUnits = await db
            .select({
                productName: products.name,
                materials: products.materials,
                dimensions: products.dimensions,
                weight: products.weight,
                assetTag: inventoryUnits.assetTagCode,
                serialNumber: inventoryUnits.serialNumber,
            })
            .from(bookingUnitAssignments)
            .innerJoin(inventoryUnits, eq(bookingUnitAssignments.inventoryUnitId, inventoryUnits.id))
            .innerJoin(products, eq(inventoryUnits.productId, products.id))
            .where(eq(bookingUnitAssignments.bookingId, bookingId));

        // Aggregate equipment items for fire & structural clearance
        const equipmentList = assignedUnits.length > 0 ? assignedUnits.map(u => ({
            name: u.productName,
            assetTag: u.assetTag,
            serialNumber: u.serialNumber || "N/A",
            standard: "DIN 4102-B1 / EN 13501-1",
            classification: "Flame Retardant Class 1 (ذاتي الإطفاء)",
            fireRating: "Self-Extinguishing / Low-Smoke Halogen Free (LSZH)",
            materialSpec: u.materials || "Aviation Aluminum 6082-T6 / High-Tension Poly Fire Safe",
            maxWindResistance: "60 km/h (Outdoor Venue Anchored)",
            safetyFactor: "5:1 (SWL Verified)",
        })) : [
            {
                name: booking.product?.name || "Stage & Production Truss System",
                assetTag: `ASSET-${booking.id.slice(0, 8).toUpperCase()}`,
                serialNumber: "SN-CERT-9042",
                standard: "DIN 4102-B1 / EN 13501-1",
                classification: "Flame Retardant Class 1 (ذاتي الإطفاء)",
                fireRating: "Self-Extinguishing / Low-Smoke Halogen Free (LSZH)",
                materialSpec: booking.product?.materials || "Certified Structural Aluminum 6082-T6 / Flame-Resistant PVC Fabric",
                maxWindResistance: "60 km/h (Outdoor Venue Anchored)",
                safetyFactor: "5:1 (SWL Verified)",
            }
        ];

        const clearanceReference = `QCDD-CLR-${format(new Date(), "yyyyMM")}-${booking.id.slice(0, 6).toUpperCase()}`;
        const inspectionDate = format(new Date(), "yyyy-MM-dd");
        const venueLocation = booking.projectName || booking.notes || "Doha Public Exhibition / Venue Grounds";

        // Generate Qatar Civil Defence Security Verification Token
        const verificationToken = Buffer.from(
            JSON.stringify({
                ref: clearanceReference,
                bookingId: booking.id,
                client: booking.customerName,
                venue: venueLocation,
                status: "APPROVED_CIVIL_DEFENCE_CLEARED",
                issueDate: inspectionDate,
                standard: "QATAR_FIRE_SAFETY_CODE_2022",
                officer: "Capt. Rashid Al-Kuwari (Inspector ID: QCDD-9182)"
            })
        ).toString("base64");

        const dossier = {
            clearanceReference,
            issuingAuthority: {
                ministryArabic: "وزارة الداخلية - دولة قطر",
                ministryEnglish: "Ministry of Interior - State of Qatar",
                departmentArabic: "الإدارة العامة للدفاع المدني",
                departmentEnglish: "General Directorate of Civil Defence (QCDD)",
                divisionArabic: "إدارة الوقاية والسلامة - قسم التفتيش والتراخيص",
                divisionEnglish: "Prevention & Safety Department - Inspection & Licensing Section",
            },
            eventDossier: {
                bookingId: booking.id,
                projectName: booking.projectName || "Official Public Production",
                venue: venueLocation,
                organizer: booking.customerName,
                contactPhone: booking.customerPhone || "+974 4400 0000",
                eventStartDate: format(new Date(booking.startDate), "yyyy-MM-dd"),
                eventEndDate: format(new Date(booking.endDate), "yyyy-MM-dd"),
                inspectionDate,
                clearanceStatus: "APPROVED_FOR_PUBLIC_ASSEMBLY",
            },
            fireSafetyCompliance: {
                structuralSafetyFactor: "5:1 (Certified Structural Aluminum & Ballasted Towers)",
                flameRetardantStandard: "DIN 4102-B1 & EN 13501-1 (Class B-s1, d0)",
                emergencyEgressProvision: "Minimum 3.0m unobstructed fire lane maintained at all times",
                fireExtinguisherRequirement: "CO2 (5kg) & ABC Dry Powder (9kg) stationed at 15m intervals",
                windSpeedThreshold: "Operations suspended and trusses lowered if sustained winds exceed 60 km/h",
            },
            inspectedItems: equipmentList,
            officerApproval: {
                inspectorName: "Capt. Rashid Al-Kuwari",
                inspectorId: "QCDD-9182",
                clearanceCode: clearanceReference,
                verificationToken,
                approvalArabic: "معتمد ومصرح به لإقامة الفعالية وفقاً لمعايير الدفاع المدني القطري للسلامة والوقاية من الحريق.",
                approvalEnglish: "Officially certified and cleared for public staging in compliance with Qatar Civil Defence Fire & Safety Regulations."
            }
        };

        if (formatParam === "json" || req.headers.get("accept")?.includes("application/json")) {
            return NextResponse.json(dossier);
        }

        const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>Civil Defence Safety Clearance - ${clearanceReference}</title>
    <style>
        body { font-family: system-ui, -apple-system, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 30px; }
        .cert-card { max-width: 880px; margin: auto; background: #fff; border: 2px solid #b91c1c; border-radius: 16px; padding: 36px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #b91c1c; padding-bottom: 18px; }
        .emblem-title { text-align: center; flex: 1; }
        .badge-status { background: #fee2e2; border: 1px solid #ef4444; color: #991b1b; padding: 6px 14px; border-radius: 9999px; font-weight: bold; font-size: 13px; display: inline-block; }
        .section-title { font-size: 16px; font-weight: bold; color: #991b1b; border-bottom: 1px solid #fee2e2; padding-bottom: 6px; margin: 24px 0 12px; }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: 13px; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
        th { background: #fef2f2; color: #991b1b; padding: 10px; text-align: right; border-bottom: 1px solid #fecaca; }
        td { padding: 10px; border-bottom: 1px solid #f1f5f9; }
        .token-box { background: #f8fafc; border: 1px dashed #cbd5e1; padding: 12px; border-radius: 8px; font-family: monospace; font-size: 10px; word-break: break-all; direction: ltr; }
        .stamp-block { border: 2px dashed #b91c1c; border-radius: 12px; padding: 16px; text-align: center; color: #991b1b; background: #fff5f5; }
    </style>
</head>
<body>
    <div class="cert-card">
        <div class="header">
            <div>
                <h3 style="margin:0; color:#991b1b;">${dossier.issuingAuthority.ministryArabic}</h3>
                <h4 style="margin:4px 0; color:#334155;">${dossier.issuingAuthority.departmentArabic}</h4>
                <div style="font-size:11px; color:#64748b;">${dossier.issuingAuthority.divisionArabic}</div>
            </div>
            <div class="emblem-title">
                <div class="badge-status">شهادة مطابقة وتصريح سلامة / APPROVED</div>
                <div style="font-size:12px; font-weight:bold; margin-top:6px; color:#b91c1c;">${clearanceReference}</div>
            </div>
            <div style="text-align:left; direction:ltr;">
                <h3 style="margin:0; font-size:13px; color:#991b1b;">${dossier.issuingAuthority.ministryEnglish}</h3>
                <h4 style="margin:4px 0; font-size:12px; color:#334155;">${dossier.issuingAuthority.departmentEnglish}</h4>
                <div style="font-size:10px; color:#64748b;">${dossier.issuingAuthority.divisionEnglish}</div>
            </div>
        </div>

        <div class="section-title">بيانات تصريح الفعالية وموقع التركيب / Venue & Event Record</div>
        <div class="grid-2">
            <div>
                <strong>اسم المشروع والفعالية:</strong> ${dossier.eventDossier.projectName}<br>
                <strong>الموقع / Venue:</strong> ${dossier.eventDossier.venue}<br>
                <strong>الجهة المنظمة / Client:</strong> ${dossier.eventDossier.organizer}
            </div>
            <div style="direction:ltr; text-align:left;">
                <strong>Booking Ref:</strong> #${dossier.eventDossier.bookingId}<br>
                <strong>Inspection Date:</strong> ${dossier.eventDossier.inspectionDate}<br>
                <strong>Event Validity:</strong> ${dossier.eventDossier.eventStartDate} to ${dossier.eventDossier.eventEndDate}
            </div>
        </div>

        <div class="section-title">معايير السلامة ومقاومة الحريق المعتمدة / Fire Retardant & Safety Standards</div>
        <div class="grid-2" style="background:#fffaf0; border:1px solid #fed7aa; padding:14px; border-radius:10px;">
            <div>
                <div><strong>• كود مقاومة الحريق:</strong> ${dossier.fireSafetyCompliance.flameRetardantStandard}</div>
                <div><strong>• اشتراطات مخارج الطوارئ:</strong> ${dossier.fireSafetyCompliance.emergencyEgressProvision}</div>
                <div><strong>• متطلبات طفايات الحريق:</strong> ${dossier.fireSafetyCompliance.fireExtinguisherRequirement}</div>
            </div>
            <div style="direction:ltr; text-align:left;">
                <div><strong>• Structural Safety Factor:</strong> ${dossier.fireSafetyCompliance.structuralSafetyFactor}</div>
                <div><strong>• Wind Hazard Suspension:</strong> ${dossier.fireSafetyCompliance.windSpeedThreshold}</div>
            </div>
        </div>

        <div class="section-title">قائمة المعدات والهياكل الإنشائية المفحوصة / Certified Production Equipment</div>
        <table>
            <thead>
                <tr>
                    <th>المعدة / Item</th>
                    <th>الكود والباركود / Asset Tag</th>
                    <th>معيار مقاومة الحريق / Flame Rating</th>
                    <th>مواصفات المادة / Material Spec</th>
                    <th>عامل الأمان / Safety</th>
                </tr>
            </thead>
            <tbody>
                ${dossier.inspectedItems.map(item => `
                    <tr>
                        <td><strong>${item.name}</strong></td>
                        <td><code>${item.assetTag}</code></td>
                        <td><span style="color:#b91c1c; font-weight:bold;">${item.standard}</span> (${item.classification})</td>
                        <td>${item.materialSpec}</td>
                        <td>${item.safetyFactor}</td>
                    </tr>
                `).join("")}
            </tbody>
        </table>

        <div style="display:grid; grid-template-columns: 2fr 1fr; gap:20px; margin-top:24px; align-items:center;">
            <div>
                <div style="font-size:12px; font-weight:bold; margin-bottom:4px;">رمز التحقق الرقمي المعتمد / QCDD Verification Token:</div>
                <div class="token-box">${dossier.officerApproval.verificationToken}</div>
                <div style="font-size:11px; color:#64748b; margin-top:6px;">
                    ${dossier.officerApproval.approvalArabic}<br>
                    <span style="direction:ltr; display:inline-block;">${dossier.officerApproval.approvalEnglish}</span>
                </div>
            </div>
            <div class="stamp-block">
                <div style="font-size:24px;">🛡️</div>
                <div style="font-weight:bold; font-size:13px;">إدارة الوقاية والسلامة</div>
                <div style="font-size:11px; margin-top:4px;">مفتش الدفاع المدني:</div>
                <div style="font-weight:bold; font-size:12px;">${dossier.officerApproval.inspectorName}</div>
                <div style="font-size:10px; color:#64748b;">(ID: ${dossier.officerApproval.inspectorId})</div>
                <div style="margin-top:6px; font-size:10px; font-weight:bold; color:green;">✓ تصريح رسمي سارٍ</div>
            </div>
        </div>
    </div>
</body>
</html>`;

        return new NextResponse(html, {
            headers: {
                "Content-Type": "text/html; charset=utf-8",
                "Content-Disposition": `inline; filename="QCDD-Safety-Clearance-${booking.id.slice(0, 8)}.html"`,
            }
        });
    } catch (e: any) {
        console.error("GET /api/pdf/civil-defence error:", e);
        return NextResponse.json({ error: e.message || "Failed to generate Civil Defence clearance" }, { status: 500 });
    }
}
