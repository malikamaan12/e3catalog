import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products, safetyCertificates, vendors, users } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { sendSafetyAlertEmail, sendSafetyDigestEmail } from "@/lib/email";

function verifyCronAuth(req: Request): boolean {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) return true;
    const authHeader = req.headers.get("authorization");
    const xSecret = req.headers.get("x-cron-secret");
    return authHeader === `Bearer ${cronSecret}` || xSecret === cronSecret;
}

export async function POST(req: Request) {
    return handleCron(req);
}

export async function GET(req: Request) {
    return handleCron(req);
}

async function handleCron(req: Request) {
    if (!verifyCronAuth(req)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        // Fetch all active certificates with their products and vendors
        const certsQuery = await db.select({
            certId: safetyCertificates.id,
            certName: safetyCertificates.certName,
            expiryDate: safetyCertificates.expiryDate,
            productId: products.id,
            productName: products.name,
            vendorId: vendors.id,
            vendorName: vendors.companyName,
        })
        .from(safetyCertificates)
        .innerJoin(products, eq(safetyCertificates.productId, products.id))
        .innerJoin(vendors, eq(products.vendorId, vendors.id));

        const expiringByVendor: Record<string, {
            vendorName: string;
            vendorEmail: string | null;
            certs: Array<{ productName: string, certName: string, daysLeft: number, expiryDate: string }>;
        }> = {};

        let totalExpiringCounter = 0;

        // Collect ALL vendor IDs to eagerly fetch their associated user emails
        const vendorIds = Array.from(new Set(certsQuery.map(c => c.vendorId)));
        
        let vendorEmailsMap: Record<string, string> = {};
        if (vendorIds.length > 0) {
            const vendorUsers = await db.select({
                vendorId: users.vendorId,
                email: users.email
            }).from(users).where(inArray(users.vendorId, vendorIds));
            // Just take the first valid email for a vendor
            vendorUsers.forEach(vu => {
                if (vu.vendorId && !vendorEmailsMap[vu.vendorId]) {
                    vendorEmailsMap[vu.vendorId] = vu.email;
                }
            });
        }

        // Process each certificate
        for (const cert of certsQuery) {
            const expiry = new Date(cert.expiryDate);
            expiry.setHours(0, 0, 0, 0);

            const diffTime = expiry.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            // Logic: Alert if expiring in exactly 30 days, exactly 15 days, exactly 0 days, or already expired (negative but maybe just once a week? we'll alert on negative too for critical)
            // To prevent spamming, we only alert on specific milestones or if it's currently expired
            if (diffDays === 30 || diffDays === 15 || diffDays <= 0) {
                totalExpiringCounter++;
                if (!expiringByVendor[cert.vendorId]) {
                    expiringByVendor[cert.vendorId] = {
                        vendorName: cert.vendorName,
                        vendorEmail: vendorEmailsMap[cert.vendorId] || null,
                        certs: []
                    };
                }
                expiringByVendor[cert.vendorId].certs.push({
                    productName: cert.productName,
                    certName: cert.certName,
                    daysLeft: diffDays,
                    expiryDate: cert.expiryDate.toISOString()
                });
            }
        }

        // Dispatch Vendor Emails
        const dispatchPromises = [];
        let vendorImpactCount = 0;

        for (const [vendorId, data] of Object.entries(expiringByVendor)) {
            if (data.vendorEmail && data.certs.length > 0) {
                vendorImpactCount++;
                dispatchPromises.push(
                    sendSafetyAlertEmail({
                        to: data.vendorEmail,
                        vendorName: data.vendorName,
                        expiringCerts: data.certs
                    })
                );
            }
        }

        // Dispatch Super Admin Digest
        if (totalExpiringCounter > 0) {
            // Find super admin email
            const superAdmins = await db.select({ email: users.email }).from(users).where(eq(users.role, "super_admin")).limit(1);
            if (superAdmins.length > 0) {
                dispatchPromises.push(
                    sendSafetyDigestEmail({
                        to: superAdmins[0].email,
                        totalExpiring: totalExpiringCounter,
                        vendorImpactCount
                    })
                );
            }
        }

        await Promise.allSettled(dispatchPromises);

        return NextResponse.json({ 
            success: true, 
            message: `Processed safety checks. Found ${totalExpiringCounter} certs requiring attention across ${vendorImpactCount} vendors.` 
        });

    } catch (error) {
        console.error("Cron Error:", error);
        return NextResponse.json({ error: "Failed to process safety cron" }, { status: 500 });
    }
}
