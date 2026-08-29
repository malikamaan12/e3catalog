import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, vendors, vendorDocuments, vendorCommercialTerms, systemLogs } from "@/lib/db/schema";
import { eq, or } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { hash } from "bcryptjs";
import { VENDOR_STATUS, DOCUMENT_STATUS, USER_ROLES } from "@/lib/constants";
import { logVendorLifecycleEvent } from "@/lib/vendor-lifecycle";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { 
            // 1. Company Identity
            companyName,
            tradingName,
            crNumber,
            tradeLicenseNumber,
            companyType,
            country = "Qatar",
            address,
            city = "Doha",
            phone,
            email,
            website,
            yearEstablished,

            // 2. Representative
            pocName,
            pocPhone,
            password,
            representativeTitle,
            agreedToAuthority,

            // 3. Capabilities
            equipmentCategories = [],
            warehouseLocations = [],
            fleetSize,
            operatingRegions = [],
            brandStory,

            // 4. KYC Documents
            documents = [],
            taxCardUrl,
            companyRegistrationUrl,

            // 5. Commercial Proposal
            proposedCommissionType = "percentage",
            proposedCommissionValue = 20,
            payoutTerms = "Net 30 Days",
            bankName,
            accountName,
            accountNumber,
            iban,
            swift,

            // 6. Agreement
            agreedToTerms
        } = body;

        if (!email || !password || !companyName || !pocName || !pocPhone) {
            return NextResponse.json({ 
                error: "Missing required fields: Company Legal Name, Representative Name, Email, Password, and Phone Number." 
            }, { status: 400 });
        }

        if (!agreedToTerms) {
            return NextResponse.json({ 
                error: "You must agree to the E3 Marketplace Vendor Terms & Agreement to proceed." 
            }, { status: 400 });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // 1. Check if user already exists
        const existingUsers = await db.select({ id: users.id }).from(users).where(eq(users.email, normalizedEmail)).limit(1);
        if (existingUsers.length > 0) {
            return NextResponse.json({ error: "An account with this email address already exists. Please log in." }, { status: 409 });
        }

        // 2. Check if CR number is already registered
        if (crNumber?.trim()) {
            const existingCR = await db.query.vendors.findFirst({
                where: eq(vendors.crNumber, crNumber.trim()),
            });
            if (existingCR) {
                return NextResponse.json({ error: `Commercial Registration (${crNumber}) is already registered with an existing vendor.` }, { status: 409 });
            }
        }

        // 3. Password Security: Hash using bcryptjs
        const hashedPassword = await hash(password, 10);
        
        const userId = uuid();
        const vendorId = uuid();
        const now = new Date();

        // 4. Atomic Transaction
        await db.transaction(async (tx) => {
            // A. Create User record (client role until admin KYC approval)
            await tx.insert(users).values({
                id: userId,
                name: pocName,
                email: normalizedEmail,
                phoneNumber: pocPhone,
                password: hashedPassword,
                role: USER_ROLES.CLIENT, // Safe lockout from vendor dashboard until approval
                companyName: companyName,
                vendorId: vendorId,
                createdAt: now,
                updatedAt: now,
            });

            // B. Create Vendor record
            await tx.insert(vendors).values({
                id: vendorId,
                userId: userId,
                companyName: companyName,
                tradingName: tradingName || null,
                crNumber: crNumber || null,
                tradeLicenseNumber: tradeLicenseNumber || null,
                companyType: companyType || null,
                country: country || "Qatar",
                address: address || null,
                city: city || "Doha",
                phone: phone || pocPhone,
                email: normalizedEmail,
                website: website || null,
                yearEstablished: yearEstablished ? Number(yearEstablished) : null,
                lifecycleStatus: VENDOR_STATUS.SUBMITTED,
                kycStatus: "pending",
                agreementStatus: "unsigned",
                equipmentCategories: Array.isArray(equipmentCategories) ? equipmentCategories : [],
                warehouseLocations: Array.isArray(warehouseLocations) ? warehouseLocations : [],
                fleetSize: fleetSize || null,
                operatingRegions: Array.isArray(operatingRegions) ? operatingRegions : [],
                brandStory: brandStory || null,
                pocName: pocName,
                pocPhone: pocPhone,
                taxCardUrl: taxCardUrl || null,
                companyRegistrationUrl: companyRegistrationUrl || null,
                bankName: bankName || null,
                accountName: accountName || null,
                accountNumber: accountNumber || null,
                iban: iban || null,
                swift: swift || null,
                commissionType: proposedCommissionType,
                commissionValue: Number(proposedCommissionValue) || 20,
                paymentTerms: payoutTerms,
                storeStatus: "active",
                createdAt: now,
                updatedAt: now,
            });

            // C. Insert KYC compliance documents
            if (companyRegistrationUrl) {
                await tx.insert(vendorDocuments).values({
                    id: uuid(),
                    vendorId,
                    documentType: "commercial_registration",
                    fileName: "Commercial-Registration-CR.pdf",
                    fileUrl: companyRegistrationUrl,
                    status: DOCUMENT_STATUS.UPLOADED,
                    createdAt: now,
                    updatedAt: now,
                });
            }

            if (taxCardUrl) {
                await tx.insert(vendorDocuments).values({
                    id: uuid(),
                    vendorId,
                    documentType: "tax_certificate",
                    fileName: "Tax-Card-Certificate.pdf",
                    fileUrl: taxCardUrl,
                    status: DOCUMENT_STATUS.UPLOADED,
                    createdAt: now,
                    updatedAt: now,
                });
            }

            if (Array.isArray(documents)) {
                for (const doc of documents) {
                    if (doc.fileUrl && doc.documentType) {
                        await tx.insert(vendorDocuments).values({
                            id: uuid(),
                            vendorId,
                            documentType: doc.documentType,
                            fileName: doc.fileName || `${doc.documentType}.pdf`,
                            fileUrl: doc.fileUrl,
                            fileSize: doc.fileSize ? Number(doc.fileSize) : null,
                            mimeType: doc.mimeType || "application/pdf",
                            issueDate: doc.issueDate ? new Date(doc.issueDate) : null,
                            expiryDate: doc.expiryDate ? new Date(doc.expiryDate) : null,
                            issuingAuthority: doc.issuingAuthority || null,
                            status: DOCUMENT_STATUS.UPLOADED,
                            createdAt: now,
                            updatedAt: now,
                        });
                    }
                }
            }

            // D. Create Initial Versioned Commercial Terms Proposal
            await tx.insert(vendorCommercialTerms).values({
                id: uuid(),
                vendorId,
                version: 1,
                commissionType: proposedCommissionType,
                commissionValue: Number(proposedCommissionValue) || 20,
                payoutTerms,
                status: "proposed",
                effectiveDate: now,
                createdAt: now,
            });

            // E. Audit Log
            await tx.insert(systemLogs).values({
                id: uuid(),
                adminId: userId,
                action: `VENDOR_APPLICATION:SUBMITTED`,
                targetId: vendorId,
                targetType: "vendor",
                details: JSON.stringify({
                    companyName,
                    crNumber: crNumber || null,
                    pocName,
                    email: normalizedEmail,
                    categories: equipmentCategories,
                }),
                createdAt: now,
            });
        });

        const applicationRef = `E3-VEN-${vendorId.slice(0, 6).toUpperCase()}`;

        return NextResponse.json({ 
            success: true, 
            vendorId,
            applicationRef,
            message: "Vendor application submitted successfully! Our compliance team will review your credentials."
        }, { status: 201 });

    } catch (error: any) {
        console.error("Vendor application processing error:", error);
        return NextResponse.json(
            { error: error.message || "A server error occurred while processing your vendor application." },
            { status: 500 }
        );
    }
}
