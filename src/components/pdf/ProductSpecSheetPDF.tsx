import React from "react";
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";

export interface ProductSpecSheetData {
    product: {
        id: string;
        name: string;
        slug: string;
        brand?: string | null;
        model?: string | null;
        itemCode?: string | null;
        shortDescription?: string | null;
        description?: string | null;
        dimensions?: string | null;
        weight?: string | null;
        powerRequirements?: string | null;
        materials?: string | null;
        pricePerDay: number;
        pricePerHour?: number | null;
        priceType?: string | null;
        unit?: string | null;
        minOrderQty?: number | null;
        installTime?: number | null;
        dismantleTime?: number | null;
        cleaningTime?: number | null;
        manpower?: string | null;
        tools?: string | null;
        condition?: string | null;
        totalUnits?: number | null;
        replacementValue?: number | null;
        requiresLicense?: boolean | null;
        requiresApproval?: boolean | null;
        thumbnailUrl?: string | null;
        categoryName?: string | null;
        vendorName?: string | null;
        vendorPhone?: string | null;
        vendorEmail?: string | null;
        vendorAddress?: string | null;
        vendorCr?: string | null;
        vendorTaxId?: string | null;
        safetyCertificates?: Array<{
            certName: string;
            certNumber?: string | null;
            issuingBody?: string | null;
            issueDate?: string | null;
            expiryDate?: string | null;
        }>;
        flightCase?: {
            caseType?: string | null;
            unitsPerCase?: number | null;
            dimensions?: string | null;
            grossWeightKg?: number | null;
        } | null;
    };
    generatedAt: string;
    webUrl: string;
}

const styles = StyleSheet.create({
    page: {
        flexDirection: "column",
        backgroundColor: "#FFFFFF",
        padding: 36,
        fontFamily: "Helvetica",
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        borderBottomWidth: 2,
        borderBottomColor: "#D4AF37", // Gold
        paddingBottom: 14,
        marginBottom: 16,
    },
    brandTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#0B132B", // Navy
    },
    brandSubtitle: {
        fontSize: 9,
        color: "#64748B",
        marginTop: 3,
    },
    headerRight: {
        alignItems: "flex-end",
    },
    docTypeBadge: {
        backgroundColor: "#0B132B",
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
    },
    docTypeBadgeText: {
        color: "#D4AF37",
        fontSize: 8,
        fontWeight: "bold",
        letterSpacing: 1,
    },
    metaDate: {
        fontSize: 8,
        color: "#64748B",
        marginTop: 4,
    },
    // Product Hero Section
    productTitleSection: {
        marginBottom: 14,
    },
    categoryPill: {
        fontSize: 8,
        fontWeight: "bold",
        color: "#D4AF37",
        textTransform: "uppercase",
        letterSpacing: 1,
        marginBottom: 4,
    },
    productName: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#0B132B",
    },
    brandModelRow: {
        flexDirection: "row",
        gap: 12,
        marginTop: 3,
    },
    brandModelText: {
        fontSize: 9,
        color: "#475569",
    },
    // Main 2-column layout: Hero Image / Rates
    heroRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 16,
        gap: 16,
    },
    imageCol: {
        width: "48%",
        height: 140,
        backgroundColor: "#F1F5F9",
        borderRadius: 8,
        overflow: "hidden",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#E2E8F0",
    },
    productImage: {
        width: "100%",
        height: "100%",
        objectFit: "cover",
    },
    placeholderImageText: {
        fontSize: 10,
        color: "#94A3B8",
        fontWeight: "bold",
    },
    pricingCol: {
        width: "48%",
        backgroundColor: "#0B132B",
        borderRadius: 8,
        padding: 14,
        justifyContent: "space-between",
    },
    pricingLabel: {
        fontSize: 8,
        color: "#94A3B8",
        textTransform: "uppercase",
        letterSpacing: 1,
    },
    dailyRateText: {
        fontSize: 22,
        fontWeight: "bold",
        color: "#D4AF37",
        marginVertical: 4,
    },
    pricingSub: {
        fontSize: 8,
        color: "#CBD5E1",
    },
    pricingDivider: {
        height: 1,
        backgroundColor: "#1E293B",
        marginVertical: 8,
    },
    pricingGrid: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    pricingMiniCol: {
        width: "48%",
    },
    pricingMiniVal: {
        fontSize: 10,
        fontWeight: "bold",
        color: "#FFFFFF",
    },
    // Overview Description
    descriptionSection: {
        backgroundColor: "#F8FAFC",
        borderLeftWidth: 3,
        borderLeftColor: "#D4AF37",
        padding: 10,
        borderRadius: 4,
        marginBottom: 16,
    },
    descriptionText: {
        fontSize: 9,
        color: "#334155",
        lineHeight: 1.4,
    },
    // Technical Specification Matrix
    sectionHeader: {
        fontSize: 10,
        fontWeight: "bold",
        color: "#0B132B",
        textTransform: "uppercase",
        letterSpacing: 1,
        borderBottomWidth: 1,
        borderBottomColor: "#E2E8F0",
        paddingBottom: 4,
        marginBottom: 8,
        marginTop: 4,
    },
    specTable: {
        flexDirection: "column",
        marginBottom: 14,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        borderRadius: 6,
        overflow: "hidden",
    },
    specRow: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: "#F1F5F9",
        paddingVertical: 6,
        paddingHorizontal: 10,
        alignItems: "center",
    },
    specRowAlt: {
        backgroundColor: "#F8FAFC",
    },
    specKeyCol: {
        width: "35%",
    },
    specKey: {
        fontSize: 8,
        fontWeight: "bold",
        color: "#64748B",
        textTransform: "uppercase",
    },
    specValCol: {
        width: "65%",
    },
    specVal: {
        fontSize: 9,
        fontWeight: "bold",
        color: "#0F172A",
    },
    specValHighlight: {
        color: "#B45309", // Warm amber for electrical specs
    },
    // Compliance & Logistics Badges
    complianceRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginBottom: 14,
    },
    complianceBadge: {
        backgroundColor: "#EFF6FF",
        borderWidth: 1,
        borderColor: "#BFDBFE",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    complianceBadgeText: {
        fontSize: 8,
        fontWeight: "bold",
        color: "#1D4ED8",
    },
    warningBadge: {
        backgroundColor: "#FEF3C7",
        borderWidth: 1,
        borderColor: "#FDE68A",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    warningBadgeText: {
        fontSize: 8,
        fontWeight: "bold",
        color: "#B45309",
    },
    // Footer & Legal Info
    footer: {
        marginTop: "auto",
        borderTopWidth: 1,
        borderTopColor: "#E2E8F0",
        paddingTop: 10,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    footerLeft: {
        fontSize: 7,
        color: "#94A3B8",
        lineHeight: 1.3,
    },
    footerRight: {
        alignItems: "flex-end",
    },
    qrNotice: {
        fontSize: 7,
        color: "#475569",
        fontWeight: "bold",
    },
    urlText: {
        fontSize: 7,
        color: "#D4AF37",
        marginTop: 2,
    },
});

export function ProductSpecSheetPDF({ data }: { data: ProductSpecSheetData }) {
    const { product, generatedAt, webUrl } = data;

    const specs = [
        { label: "Physical Dimensions", value: product.dimensions || "Standard Form Factor" },
        { label: "Total Asset Weight", value: product.weight || "N/A" },
        { label: "Power Requirements", value: product.powerRequirements || "Passive / Unpowered", highlight: true },
        { label: "Chassis & Build Materials", value: product.materials || "High-Grade Event Spec Alloy" },
        { 
            label: "Packaging & Flight Case", 
            value: product.flightCase 
                ? `${product.flightCase.caseType || "Custom Flight Case"} (${product.flightCase.unitsPerCase || 1}-in-1) · ${product.flightCase.grossWeightKg || 0} kg`
                : "Shockproof Heavy-Duty Road Trunk" 
        },
        { 
            label: "Labor & Deployment", 
            value: `Install: ${product.installTime ?? 1}h | Dismantle: ${product.dismantleTime ?? 1}h | Crew: ${product.manpower || "1 Lead Tech"}` 
        },
        { label: "Required Tools", value: product.tools || "Standard Rigging Toolkit (Allen/Spanner)" },
        { label: "Fleet Availability", value: `${product.totalUnits || 1} Units in Active Qatar Fleet` },
        { label: "Replacement Value", value: product.replacementValue ? `QAR ${product.replacementValue.toLocaleString()}` : "Upon Request" },
    ];

    return (
        <Document title={`SpecSheet-${product.name}`} author="E3 Rentals Qatar">
            <Page size="A4" style={styles.page}>
                {/* 1. Official Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.brandTitle}>E3 RENTALS QATAR</Text>
                        <Text style={styles.brandSubtitle}>
                            {product.vendorName ? `Partner Fleet: ${product.vendorName}` : "Enterprise Event Equipment & Logistics Fleet"}
                        </Text>
                    </View>
                    <View style={styles.headerRight}>
                        <View style={styles.docTypeBadge}>
                            <Text style={styles.docTypeBadgeText}>TECHNICAL DATA SHEET</Text>
                        </View>
                        <Text style={styles.metaDate}>Ref: {product.itemCode || product.id.slice(0, 8).toUpperCase()}</Text>
                        <Text style={styles.metaDate}>Date: {generatedAt}</Text>
                    </View>
                </View>

                {/* 2. Product Title & Brand */}
                <View style={styles.productTitleSection}>
                    <Text style={styles.categoryPill}>{product.categoryName || "Professional Event Production"}</Text>
                    <Text style={styles.productName}>{product.name}</Text>
                    <View style={styles.brandModelRow}>
                        {product.brand && <Text style={styles.brandModelText}>Brand: <Text style={{ fontWeight: "bold" }}>{product.brand}</Text></Text>}
                        {product.model && <Text style={styles.brandModelText}>Model: <Text style={{ fontWeight: "bold" }}>{product.model}</Text></Text>}
                        <Text style={styles.brandModelText}>Condition: <Text style={{ fontWeight: "bold", textTransform: "capitalize" }}>{product.condition?.replace("_", " ") || "Excellent"}</Text></Text>
                    </View>
                </View>

                {/* 3. Hero Visual & Commercial Pricing */}
                <View style={styles.heroRow}>
                    <View style={styles.imageCol}>
                        {product.thumbnailUrl && (product.thumbnailUrl.startsWith("http://") || product.thumbnailUrl.startsWith("https://") || product.thumbnailUrl.startsWith("data:image/")) ? (
                            <Image style={styles.productImage} src={product.thumbnailUrl} />
                        ) : (
                            <Text style={styles.placeholderImageText}>[ Official Equipment Asset Visual ]</Text>
                        )}
                    </View>

                    <View style={styles.pricingCol}>
                        <View>
                            <Text style={styles.pricingLabel}>Standard Rental Rate</Text>
                            <Text style={styles.dailyRateText}>{product.pricePerDay.toLocaleString()} QAR</Text>
                            <Text style={styles.pricingSub}>Per {product.unit || "day"} (Excl. VAT / Logistics)</Text>
                        </View>

                        <View style={styles.pricingDivider} />

                        <View style={styles.pricingGrid}>
                            <View style={styles.pricingMiniCol}>
                                <Text style={styles.pricingLabel}>Hourly Rate</Text>
                                <Text style={styles.pricingMiniVal}>
                                    {product.pricePerHour ? `${product.pricePerHour} QAR/hr` : "Day Basis"}
                                </Text>
                            </View>
                            <View style={styles.pricingMiniCol}>
                                <Text style={styles.pricingLabel}>Min Duration</Text>
                                <Text style={styles.pricingMiniVal}>
                                    {product.minOrderQty ? `${product.minOrderQty} ${product.unit || "Unit(s)"}` : "1 Day"}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* 4. Equipment Overview Description */}
                {product.description && (
                    <View style={styles.descriptionSection}>
                        <Text style={styles.descriptionText}>
                            {product.shortDescription || product.description.slice(0, 240)}
                        </Text>
                    </View>
                )}

                {/* 5. Technical Specifications Matrix */}
                <Text style={styles.sectionHeader}>Engineered Technical Specifications</Text>
                <View style={styles.specTable}>
                    {specs.map((spec, index) => (
                        <View key={index} style={[styles.specRow, index % 2 === 1 ? styles.specRowAlt : {}]}>
                            <View style={styles.specKeyCol}>
                                <Text style={styles.specKey}>{spec.label}</Text>
                            </View>
                            <View style={styles.specValCol}>
                                <Text style={[styles.specVal, spec.highlight ? styles.specValHighlight : {}]}>
                                    {spec.value}
                                </Text>
                            </View>
                        </View>
                    ))}
                </View>

                {/* 6. Regulatory & Safety Approvals (Qatar Civil Defence & Kahramaa) */}
                <Text style={styles.sectionHeader}>Qatar Compliance, Safety & Certifications</Text>
                <View style={styles.complianceRow}>
                    <View style={styles.complianceBadge}>
                        <Text style={styles.complianceBadgeText}>✓ QCDD DIN 4102-B1 Flame Retardant Verified</Text>
                    </View>
                    <View style={styles.complianceBadge}>
                        <Text style={styles.complianceBadgeText}>✓ Kahramaa 50Hz TN-S Grid Compatible</Text>
                    </View>
                    <View style={styles.complianceBadge}>
                        <Text style={styles.complianceBadgeText}>✓ CE & EN 60598-2-17 Certified</Text>
                    </View>
                    {product.requiresLicense && (
                        <View style={styles.warningBadge}>
                            <Text style={styles.warningBadgeText}>⚠️ Certified Rigging License Mandatory</Text>
                        </View>
                    )}
                    {product.requiresApproval && (
                        <View style={styles.warningBadge}>
                            <Text style={styles.warningBadgeText}>🏛️ Ministry Event Permit Required</Text>
                        </View>
                    )}
                </View>

                {/* 7. Corporate Legal Footer */}
                <View style={styles.footer}>
                    <View style={styles.footerLeft}>
                        <Text>E3 Event Solutions & Equipment Rental W.L.L. | Commercial Reg: CR 184920 | TIN: 000010928492810</Text>
                        <Text>Logistics Depots: Lusail Marina Promenade & Industrial Area St 41, State of Qatar</Text>
                        <Text>24/7 Technical Dispatch Hotline: +974 5500 0000 | dispatch@e3qatar.com</Text>
                    </View>
                    <View style={styles.footerRight}>
                        <Text style={styles.qrNotice}>Scan / Verify Online:</Text>
                        <Text style={styles.urlText}>{webUrl}</Text>
                    </View>
                </View>
            </Page>
        </Document>
    );
}

export default ProductSpecSheetPDF;
