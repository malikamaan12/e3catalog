import { NextRequest, NextResponse } from "next/server";
import { renderToStream } from "@react-pdf/renderer";
import RentalAgreementPDF from "@/components/agreements/RentalAgreementPDF";
import { db } from "@/lib/db";
import { rentalAgreements } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { format } from "date-fns";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    try {
        const agreement = await db.query.rentalAgreements.findFirst({
            where: eq(rentalAgreements.id, id),
            with: {
                booking: {
                    with: { product: true }
                },
                client: true,
            }
        });

        if (!agreement) {
            return NextResponse.json({ error: "Agreement not found" }, { status: 404 });
        }

        const data = {
            agreementNumber: agreement.agreementNumber,
            date: format(new Date(agreement.createdAt), "MMMM do, yyyy"),
            status: agreement.status,
            clientName: agreement.signedByClientName || agreement.client?.name || "Valued Client",
            clientEmail: agreement.client?.email || "N/A",
            clientPhone: agreement.client?.phoneNumber || undefined,
            clientQid: agreement.signedByClientQid || undefined,
            projectName: agreement.booking?.projectName || "Live Event Production",
            venue: agreement.booking?.notes || agreement.booking?.customNotes || "Doha Operational Site",
            startDate: agreement.booking ? format(new Date(agreement.booking.startDate), "MMM do, yyyy") : "N/A",
            endDate: agreement.booking ? format(new Date(agreement.booking.endDate), "MMM do, yyyy") : "N/A",
            productName: agreement.booking?.product?.name || "Event Production Equipment",
            units: agreement.booking?.units || 1,
            totalRentPrice: agreement.booking?.totalPrice || 0,
            replacementValue: agreement.replacementValueTotal || (agreement.booking?.totalPrice || 1000) * 8,
            securityDeposit: agreement.securityDepositAmount || (agreement.booking?.totalPrice || 1000) * 0.20,
            signatureData: agreement.clientSignatureData,
            signedAt: agreement.signedAt ? format(new Date(agreement.signedAt), "MMM do, yyyy HH:mm") : null,
            ipAddress: agreement.ipAddress,
        };

        const stream = await renderToStream(RentalAgreementPDF({ data }));

        return new Response(stream as any, {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `inline; filename="E3-Rental-Agreement-${agreement.agreementNumber}.pdf"`,
            }
        });

    } catch (e: any) {
        console.error("PDF agreement error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
