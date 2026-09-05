import React from "react";
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";

export interface CatalogProductItem {
    id: string;
    name: string;
    slug: string;
    itemCode?: string | null;
    brand?: string | null;
    model?: string | null;
    shortDescription?: string | null;
    pricePerDay: number;
    pricePerHour?: number | null;
    unit?: string | null;
    dimensions?: string | null;
    weight?: string | null;
    powerRequirements?: string | null;
    totalUnits?: number | null;
    thumbnailUrl?: string | null;
    categoryName?: string | null;
    categorySlug?: string | null;
    requiresLicense?: boolean | null;
}

export interface VendorCatalogData {
    title: string;
    edition: string;
    generatedAt: string;
    vendor?: {
        companyName: string;
        phone?: string | null;
        email?: string | null;
        address?: string | null;
        crNumber?: string | null;
        taxId?: string | null;
        logoUrl?: string | null;
    } | null;
    categoryGroups: Array<{
        categoryName: string;
        categorySlug: string;
        products: CatalogProductItem[];
    }>;
    totalAssetsCount: number;
    totalCategoriesCount: number;
    webUrl: string;
}

const styles = StyleSheet.create({
    page: {
        flexDirection: "column",
        backgroundColor: "#FFFFFF",
        padding: 36,
        fontFamily: "Helvetica",
    },
    // Cover Page Styles
    coverPage: {
        flexDirection: "column",
        backgroundColor: "#0B132B", // Navy
        padding: 48,
        fontFamily: "Helvetica",
        justifyContent: "space-between",
    },
    coverTop: {
        borderBottomWidth: 2,
        borderBottomColor: "#D4AF37",
        paddingBottom: 24,
    },
    coverBrand: {
        fontSize: 28,
        fontWeight: "bold",
        color: "#FFFFFF",
        letterSpacing: 2,
    },
    coverBrandGold: {
        color: "#D4AF37",
    },
    coverSubbrand: {
        fontSize: 10,
        color: "#94A3B8",
        marginTop: 6,
        letterSpacing: 1.5,
        textTransform: "uppercase",
    },
    coverCenter: {
        marginVertical: "auto",
        paddingVertical: 40,
    },
    coverBadge: {
        backgroundColor: "rgba(212, 175, 55, 0.15)",
        borderWidth: 1,
        borderColor: "#D4AF37",
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 6,
        alignSelf: "flex-start",
        marginBottom: 16,
    },
    coverBadgeText: {
        color: "#D4AF37",
        fontSize: 9,
        fontWeight: "bold",
        letterSpacing: 2,
        textTransform: "uppercase",
    },
    coverTitle: {
        fontSize: 32,
        fontWeight: "bold",
        color: "#FFFFFF",
        lineHeight: 1.2,
        marginBottom: 12,
    },
    coverSubtitle: {
        fontSize: 12,
        color: "#CBD5E1",
        lineHeight: 1.5,
        maxWidth: 420,
    },
    coverStatsRow: {
        flexDirection: "row",
        gap: 24,
        marginTop: 32,
        paddingTop: 24,
        borderTopWidth: 1,
        borderTopColor: "rgba(255, 255, 255, 0.1)",
    },
    coverStatBox: {
        flexDirection: "column",
    },
    coverStatVal: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#D4AF37",
    },
    coverStatLabel: {
        fontSize: 8,
        color: "#94A3B8",
        textTransform: "uppercase",
        letterSpacing: 1,
        marginTop: 2,
    },
    coverBottom: {
        borderTopWidth: 1,
        borderTopColor: "rgba(255, 255, 255, 0.15)",
        paddingTop: 16,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-end",
    },
    coverLegalText: {
        fontSize: 8,
        color: "#64748B",
        lineHeight: 1.4,
    },
    coverYearBadge: {
        color: "#D4AF37",
        fontSize: 11,
        fontWeight: "bold",
    },
    // Standard Inside Page Header
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottomWidth: 1.5,
        borderBottomColor: "#D4AF37",
        paddingBottom: 10,
        marginBottom: 18,
    },
    headerLogo: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#0B132B",
    },
    headerSub: {
        fontSize: 8,
        color: "#64748B",
    },
    headerPageNum: {
        fontSize: 8,
        color: "#94A3B8",
        fontWeight: "bold",
    },
    // Category Heading
    categoryHeadingBox: {
        backgroundColor: "#0B132B",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 4,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
        marginTop: 6,
    },
    categoryHeadingText: {
        fontSize: 11,
        fontWeight: "bold",
        color: "#FFFFFF",
        textTransform: "uppercase",
        letterSpacing: 1,
    },
    categoryCountPill: {
        fontSize: 8,
        fontWeight: "bold",
        color: "#D4AF37",
    },
    // Product List Table / Cards
    productItem: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: "#E2E8F0",
        paddingVertical: 8,
        gap: 12,
        alignItems: "center",
    },
    productThumbBox: {
        width: 48,
        height: 48,
        backgroundColor: "#F1F5F9",
        borderRadius: 4,
        overflow: "hidden",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#E2E8F0",
    },
    productThumb: {
        width: "100%",
        height: "100%",
        objectFit: "cover",
    },
    thumbPlaceholder: {
        fontSize: 7,
        color: "#94A3B8",
        fontWeight: "bold",
        textAlign: "center",
    },
    productInfoCol: {
        flex: 1,
    },
    productTitle: {
        fontSize: 10,
        fontWeight: "bold",
        color: "#0F172A",
    },
    productBrandModel: {
        fontSize: 8,
        color: "#475569",
        marginTop: 1,
    },
    productSpecsMini: {
        fontSize: 7,
        color: "#64748B",
        marginTop: 2,
    },
    productPricingCol: {
        width: 100,
        alignItems: "flex-end",
    },
    productPrice: {
        fontSize: 11,
        fontWeight: "bold",
        color: "#B45309",
    },
    productPriceSub: {
        fontSize: 7,
        color: "#94A3B8",
    },
    unitsBadge: {
        backgroundColor: "#F1F5F9",
        paddingHorizontal: 5,
        paddingVertical: 2,
        borderRadius: 3,
        marginTop: 3,
    },
    unitsBadgeText: {
        fontSize: 7,
        fontWeight: "bold",
        color: "#475569",
    },
    // Back Cover / Terms Page
    backPage: {
        flexDirection: "column",
        backgroundColor: "#FFFFFF",
        padding: 36,
        fontFamily: "Helvetica",
    },
    termsBox: {
        backgroundColor: "#F8FAFC",
        borderWidth: 1,
        borderColor: "#E2E8F0",
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
    },
    termsTitle: {
        fontSize: 11,
        fontWeight: "bold",
        color: "#0B132B",
        marginBottom: 8,
        textTransform: "uppercase",
        letterSpacing: 1,
    },
    termItem: {
        fontSize: 8,
        color: "#334155",
        lineHeight: 1.5,
        marginBottom: 6,
    },
    contactCard: {
        backgroundColor: "#0B132B",
        borderRadius: 8,
        padding: 18,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: "auto",
    },
    contactCardLeft: {
        flex: 1,
    },
    contactTitle: {
        fontSize: 12,
        fontWeight: "bold",
        color: "#D4AF37",
        marginBottom: 4,
    },
    contactText: {
        fontSize: 8,
        color: "#E2E8F0",
        lineHeight: 1.4,
    },
    contactBadgeRight: {
        backgroundColor: "rgba(212, 175, 55, 0.2)",
        borderWidth: 1,
        borderColor: "#D4AF37",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 6,
    },
    contactBadgeText: {
        color: "#D4AF37",
        fontSize: 8,
        fontWeight: "bold",
        letterSpacing: 1,
    },
});

export function VendorCatalogPDF({ data }: { data: VendorCatalogData }) {
    const { title, edition, generatedAt, vendor, categoryGroups, totalAssetsCount, totalCategoriesCount, webUrl } = data;

    const vendorDisplayName = vendor?.companyName || "E3 Rentals Enterprise Fleet";

    return (
        <Document title={`${title} - ${vendorDisplayName}`} author="E3 Rentals Qatar">
            {/* 1. Official Cover Page */}
            <Page size="A4" style={styles.coverPage}>
                <View style={styles.coverTop}>
                    <Text style={styles.coverBrand}>
                        E3 <Text style={styles.coverBrandGold}>RENTALS</Text> QATAR
                    </Text>
                    <Text style={styles.coverSubbrand}>Official Event Production & Equipment Fleet</Text>
                </View>

                <View style={styles.coverCenter}>
                    <View style={styles.coverBadge}>
                        <Text style={styles.coverBadgeText}>EQUIPMENT CATALOGUE</Text>
                    </View>
                    <Text style={styles.coverTitle}>{vendorDisplayName}</Text>
                    <Text style={styles.coverSubtitle}>
                        Professional Audio, Concert Lighting, Structural Trussing, 4K LED Display Walls & Temporary Power Distribution.
                    </Text>

                    <View style={styles.coverStatsRow}>
                        <View style={styles.coverStatBox}>
                            <Text style={styles.coverStatVal}>{totalAssetsCount}</Text>
                            <Text style={styles.coverStatLabel}>Active Fleet Items</Text>
                        </View>
                        <View style={styles.coverStatBox}>
                            <Text style={styles.coverStatVal}>{totalCategoriesCount}</Text>
                            <Text style={styles.coverStatLabel}>Equipment Categories</Text>
                        </View>
                        <View style={styles.coverStatBox}>
                            <Text style={styles.coverStatVal}>Doha, Qatar</Text>
                            <Text style={styles.coverStatLabel}>Coverage Area</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.coverBottom}>
                    <View>
                        <Text style={styles.coverLegalText}>State of Qatar | Commercial Reg: CR 184920 | General Tax Authority TIN: 000010928492810</Text>
                        <Text style={styles.coverLegalText}>Civil Defence Fire-Retardant DIN 4102-B1 & Kahramaa 3-Phase Approved</Text>
                    </View>
                    <Text style={styles.coverYearBadge}>{edition}</Text>
                </View>
            </Page>

            {/* 2. Categorized Equipment Pages */}
            {categoryGroups.map((group, groupIdx) => (
                <Page key={groupIdx} size="A4" style={styles.page}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.headerLogo}>E3 RENTALS QATAR — {vendorDisplayName.toUpperCase()}</Text>
                            <Text style={styles.headerSub}>Published Catalog · Generated {generatedAt}</Text>
                        </View>
                        <Text style={styles.headerPageNum}>Section {groupIdx + 1} of {categoryGroups.length}</Text>
                    </View>

                    {/* Category Title Banner */}
                    <View style={styles.categoryHeadingBox}>
                        <Text style={styles.categoryHeadingText}>{group.categoryName}</Text>
                        <Text style={styles.categoryCountPill}>{group.products.length} Equipment Items</Text>
                    </View>

                    {/* Products in this category */}
                    <View style={{ flex: 1 }}>
                        {group.products.map((item, pIdx) => (
                            <View key={pIdx} style={styles.productItem}>
                                <View style={styles.productThumbBox}>
                                    {item.thumbnailUrl && (item.thumbnailUrl.startsWith("http://") || item.thumbnailUrl.startsWith("https://") || item.thumbnailUrl.startsWith("data:image/")) ? (
                                        <Image style={styles.productThumb} src={item.thumbnailUrl} />
                                    ) : (
                                        <Text style={styles.thumbPlaceholder}>[ Asset ]</Text>
                                    )}
                                </View>

                                <View style={styles.productInfoCol}>
                                    <Text style={styles.productTitle}>{item.name}</Text>
                                    <Text style={styles.productBrandModel}>
                                        {item.brand ? `Brand: ${item.brand}` : ""} {item.model ? `· Model: ${item.model}` : ""} {item.itemCode ? `(SKU: ${item.itemCode})` : ""}
                                    </Text>
                                    <Text style={styles.productSpecsMini}>
                                        {item.dimensions ? `Dims: ${item.dimensions}` : ""} 
                                        {item.weight ? ` · Weight: ${item.weight}` : ""} 
                                        {item.powerRequirements ? ` · Power: ${item.powerRequirements}` : ""}
                                    </Text>
                                </View>

                                <View style={styles.productPricingCol}>
                                    <Text style={styles.productPrice}>{item.pricePerDay.toLocaleString()} QAR</Text>
                                    <Text style={styles.productPriceSub}>Per {item.unit || "day"}</Text>
                                    <View style={styles.unitsBadge}>
                                        <Text style={styles.unitsBadgeText}>Stock: {item.totalUnits || 1} Units</Text>
                                    </View>
                                </View>
                            </View>
                        ))}
                    </View>

                    {/* Inside Page Footer */}
                    <View style={{ borderTopWidth: 1, borderTopColor: "#E2E8F0", paddingTop: 8, marginTop: "auto", flexDirection: "row", justifyContent: "space-between" }}>
                        <Text style={{ fontSize: 7, color: "#94A3B8" }}>E3 Rentals Qatar — Direct Bookings & Real-Time Availability: {webUrl}</Text>
                        <Text style={{ fontSize: 7, color: "#D4AF37", fontWeight: "bold" }}>Official Price Matrix</Text>
                    </View>
                </Page>
            ))}

            {/* 3. Operational Terms & Back Cover */}
            <Page size="A4" style={styles.backPage}>
                <View style={styles.header}>
                    <View>
                        <Text style={styles.headerLogo}>E3 RENTALS QATAR — TERMS OF SERVICE</Text>
                        <Text style={styles.headerSub}>Mobilization, Logistics & Qatar Compliance Protocols</Text>
                    </View>
                </View>

                <View style={styles.termsBox}>
                    <Text style={styles.termsTitle}>1. Mobilization & Staging Logistics</Text>
                    <Text style={styles.termItem}>• All rental items are inspected, barcoded, and pre-flighted at our Lusail Marina Promenade and Industrial Area depots prior to load-out.</Text>
                    <Text style={styles.termItem}>• Standard dispatch includes delivery, tailgate drop-off, and return collection across Doha, Al Wakrah, Lusail, and Al Khor.</Text>
                    <Text style={styles.termItem}>• 24/7 on-call field rigging technicians and audio-visual support crew are available on request.</Text>
                </View>

                <View style={styles.termsBox}>
                    <Text style={styles.termsTitle}>2. Regulatory Safety & Approvals</Text>
                    <Text style={styles.termItem}>• All scenic fabrics, trussing, and stages comply with Qatar Civil Defence (QCDD) DIN 4102-B1 flame retardant specifications.</Text>
                    <Text style={styles.termItem}>• Temporary electrical distributions conform to KAHRAMAA 415V/240V TN-S earthing with 30mA RCD protection.</Text>
                </View>

                <View style={styles.termsBox}>
                    <Text style={styles.termsTitle}>3. Commercial Terms & Payment</Text>
                    <Text style={styles.termItem}>• Rental bookings require 100% advance settlement or an authorized corporate purchase order.</Text>
                    <Text style={styles.termItem}>• Valid for 30 days from date of publication. Rates exclude optional operator labor and VAT.</Text>
                </View>

                <View style={styles.contactCard}>
                    <View style={styles.contactCardLeft}>
                        <Text style={styles.contactTitle}>Book Online or Request a Dedicated Quote</Text>
                        <Text style={styles.contactText}>Tel: +974 5500 0000 | Email: dispatch@e3qatar.com</Text>
                        <Text style={styles.contactText}>Portal: {webUrl}</Text>
                    </View>
                    <View style={styles.contactBadgeRight}>
                        <Text style={styles.contactBadgeText}>24/7 FLEET RADAR</Text>
                    </View>
                </View>
            </Page>
        </Document>
    );
}

export default VendorCatalogPDF;
