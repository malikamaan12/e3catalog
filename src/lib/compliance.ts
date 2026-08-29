import { db } from "./db";
import { safetyCertificates, vendorDocuments, products, vendors, complianceRules } from "./db/schema";
import { eq, and, sql } from "drizzle-orm";

export interface ProductComplianceResult {
    isCompliant: boolean;
    isBlocked: boolean;
    missingCertificates: string[];
    expiredCertificates: string[];
    activeCertificates: string[];
}

export interface VendorComplianceResult {
    isCompliant: boolean;
    kycStatus: string;
    missingDocs: string[];
    expiredDocs: string[];
    riskLevel: "low" | "medium" | "high" | "critical";
}

/**
 * Evaluates product compliance against safety certificate requirements.
 * If a mandatory certificate is missing or expired, the product/asset is blocked from booking availability.
 */
export async function evaluateProductCompliance(productId: string): Promise<ProductComplianceResult> {
    const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
    if (!product) {
        return {
            isCompliant: false,
            isBlocked: true,
            missingCertificates: ["Product not found"],
            expiredCertificates: [],
            activeCertificates: [],
        };
    }

    const certs = await db.select().from(safetyCertificates).where(eq(safetyCertificates.productId, productId));
    const now = new Date();

    const activeCertificates: string[] = [];
    const expiredCertificates: string[] = [];

    for (const cert of certs) {
        if (cert.expiryDate && new Date(cert.expiryDate) < now) {
            expiredCertificates.push(cert.certName);
        } else {
            activeCertificates.push(cert.certName);
        }
    }

    // Check if category or product mandates license/certificate
    const isMandatory = product.requiresLicense || product.requiresApproval;
    const isCompliant = (!isMandatory || activeCertificates.length > 0) && expiredCertificates.length === 0;
    const isBlocked = isMandatory && (activeCertificates.length === 0 || expiredCertificates.length > 0);

    return {
        isCompliant,
        isBlocked: Boolean(isBlocked),
        missingCertificates: isMandatory && activeCertificates.length === 0 ? ["Mandatory Safety Certificate"] : [],
        expiredCertificates,
        activeCertificates,
    };
}

/**
 * Evaluates vendor compliance against KYC requirements.
 */
export async function evaluateVendorCompliance(vendorId: string): Promise<VendorComplianceResult> {
    const [vendor] = await db.select().from(vendors).where(eq(vendors.id, vendorId)).limit(1);
    if (!vendor) {
        return {
            isCompliant: false,
            kycStatus: "missing",
            missingDocs: ["Vendor profile missing"],
            expiredDocs: [],
            riskLevel: "critical",
        };
    }

    const docs = await db.select().from(vendorDocuments).where(eq(vendorDocuments.vendorId, vendorId));
    const now = new Date();

    const requiredDocTypes = ["commercial_registration", "trade_license"];
    const uploadedTypes = new Set(docs.map(d => d.documentType));
    const missingDocs = requiredDocTypes.filter(t => !uploadedTypes.has(t));

    const expiredDocs = docs
        .filter(d => d.expiryDate && new Date(d.expiryDate) < now)
        .map(d => d.documentType);

    let riskLevel: "low" | "medium" | "high" | "critical" = "low";
    if (vendor.lifecycleStatus === "suspended" || missingDocs.length > 0 || expiredDocs.length > 0) {
        riskLevel = "high";
    }
    if (vendor.lifecycleStatus === "suspended") {
        riskLevel = "critical";
    }

    const isCompliant = vendor.kycStatus === "verified" && missingDocs.length === 0 && expiredDocs.length === 0;

    return {
        isCompliant,
        kycStatus: vendor.kycStatus,
        missingDocs,
        expiredDocs,
        riskLevel,
    };
}
