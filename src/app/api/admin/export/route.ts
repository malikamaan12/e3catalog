import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { bookings, invoices, inventoryUnits, vendors } from "@/lib/db/schema";
import { hasPermission } from "@/lib/permissions";
import { logAuditEvent } from "@/lib/audit";

/**
 * Sanitizes CSV field values to prevent CSV Formula Injection (=, +, -, @, \t, \r).
 */
function sanitizeCsvValue(value: any): string {
    if (value === null || value === undefined) return '""';
    let str = String(value);
    // Neutralize dangerous leading characters with single quote
    if (/^[=+\-@\t\r]/.test(str)) {
        str = "'" + str;
    }
    return '"' + str.replace(/"/g, '""') + '"';
}

export async function POST(req: Request) {
    try {
        const { user, error } = await requireAuth();
        if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        if (!hasPermission(user.role, "export_sensitive_data")) {
            return NextResponse.json({ error: "Forbidden: Export permission required" }, { status: 403 });
        }

        const body = await req.json();
        const { entityType } = body; // bookings | invoices | inventory | vendors

        let csvData = "";
        let rowCount = 0;

        if (entityType === "bookings") {
            const rows = await db.select({
                id: bookings.id,
                customer: bookings.customerName,
                email: bookings.customerEmail,
                status: bookings.status,
                totalPrice: bookings.totalPrice,
                startDate: bookings.startDate,
                endDate: bookings.endDate,
            }).from(bookings).limit(1000);

            rowCount = rows.length;
            const headers = ["Booking ID", "Customer", "Email", "Status", "Total Price (QAR)", "Start Date", "End Date"];
            const csvRows = [headers.join(",")];
            for (const r of rows) {
                csvRows.push([
                    sanitizeCsvValue(r.id),
                    sanitizeCsvValue(r.customer),
                    sanitizeCsvValue(r.email),
                    sanitizeCsvValue(r.status),
                    sanitizeCsvValue(r.totalPrice),
                    sanitizeCsvValue(r.startDate),
                    sanitizeCsvValue(r.endDate),
                ].join(","));
            }
            csvData = csvRows.join("\n");
        } else if (entityType === "invoices") {
            const rows = await db.select({
                invoiceNumber: invoices.invoiceNumber,
                customer: invoices.customerName,
                totalAmount: invoices.totalAmount,
                amountDue: invoices.amountDue,
                status: invoices.status,
                issueDate: invoices.issueDate,
                dueDate: invoices.dueDate,
            }).from(invoices).limit(1000);

            rowCount = rows.length;
            const headers = ["Invoice Number", "Customer", "Total Amount (QAR)", "Amount Due (QAR)", "Status", "Issue Date", "Due Date"];
            const csvRows = [headers.join(",")];
            for (const r of rows) {
                csvRows.push([
                    sanitizeCsvValue(r.invoiceNumber),
                    sanitizeCsvValue(r.customer),
                    sanitizeCsvValue(r.totalAmount),
                    sanitizeCsvValue(r.amountDue),
                    sanitizeCsvValue(r.status),
                    sanitizeCsvValue(r.issueDate),
                    sanitizeCsvValue(r.dueDate),
                ].join(","));
            }
            csvData = csvRows.join("\n");
        } else {
            return NextResponse.json({ error: "Invalid entity type for export" }, { status: 400 });
        }

        await logAuditEvent({
            actorId: user.id,
            actorEmail: user.email,
            actorRole: user.role,
            action: "data.exported",
            objectType: entityType,
            metadata: { rowCount, entityType },
            severity: "info",
        });

        return new NextResponse(csvData, {
            headers: {
                "Content-Type": "text/csv",
                "Content-Disposition": `attachment; filename="e3_${entityType}_${Date.now()}.csv"`,
            },
        });
    } catch (err: any) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
