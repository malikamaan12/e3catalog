import React from "react";
import { Document, Page, Text, View, StyleSheet, Image, Font } from "@react-pdf/renderer";

// Define strict A4 dimensions and typography
const styles = StyleSheet.create({
    page: {
        flexDirection: "column",
        backgroundColor: "#FFFFFF",
        paddingTop: 100, // Space for Header Graphic (absolute)
        paddingBottom: 100, // Space for Footer Graphic (absolute)
        paddingHorizontal: 40,
    },
    headerOverlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 80,
    },
    footerOverlay: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 60,
    },
    // Typography
    title: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#0f172a", // navy
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: "#64748b", // slate
        marginBottom: 20,
    },
    text: {
        fontSize: 10,
        color: "#334155",
        lineHeight: 1.5,
    },
    label: {
        fontSize: 9,
        color: "#94a3b8",
        fontWeight: "bold",
        textTransform: "uppercase",
        marginBottom: 2,
    },
    value: {
        fontSize: 11,
        color: "#0f172a",
        fontWeight: "bold",
        marginBottom: 10,
    },
    // Layout Blocks
    section: {
        marginBottom: 24,
    },
    grid2: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 20,
    },
    col: {
        width: "48%",
    },
    // Product Page Blocks
    productHeroImage: {
        width: "100%",
        height: 250,
        objectFit: "cover",
        borderRadius: 8,
        marginBottom: 16,
    },
    specBox: {
        backgroundColor: "#f8fafc",
        padding: 12,
        borderRadius: 6,
        marginBottom: 10,
    },
    // Financials
    tableRow: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: "#e2e8f0",
        paddingVertical: 8,
        alignItems: "center",
    },
    tableHeaderRow: {
        flexDirection: "row",
        borderBottomWidth: 2,
        borderBottomColor: "#cbd5e1",
        paddingBottom: 8,
        marginBottom: 4,
    },
    tableColLeft: { flex: 3 },
    tableColCenter: { flex: 1, textAlign: "center" },
    tableColRight: { flex: 1, textAlign: "right" },
    grandTotalBox: {
        backgroundColor: "#0f172a",
        padding: 16,
        borderRadius: 8,
        marginTop: 20,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    grandTotalLabel: {
        color: "#cbd5e1",
        fontSize: 12,
        fontWeight: "bold",
        textTransform: "uppercase",
    },
    grandTotalValue: {
        color: "#fbbf24", // gold
        fontSize: 20,
        fontWeight: "bold",
    },
    termsBox: {
        marginTop: 40,
        borderTopWidth: 1,
        borderTopColor: "#e2e8f0",
        paddingTop: 20,
    },
    termsText: {
        fontSize: 8,
        color: "#64748b",
        lineHeight: 1.4,
    },
    // Premium Product Showcase Styles
    heroSection: {
        marginBottom: 16,
    },
    productHeroImageLarge: {
        width: "100%",
        height: 280,
        objectFit: "cover",
        borderRadius: 8,
    },
    productTitleBox: {
        marginTop: 12,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    productTitle: {
        fontSize: 22,
        fontWeight: "bold",
        color: "#0f172a",
        flex: 1,
    },
    itemCode: {
        fontSize: 10,
        color: "#64748b",
        fontFamily: "Courier",
        backgroundColor: "#f1f5f9",
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 4,
    },
    badgeContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        marginBottom: 12,
    },
    badge: {
        backgroundColor: "#e0f2fe",
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 4,
        marginRight: 6,
        marginBottom: 6,
    },
    badgeText: {
        fontSize: 8,
        color: "#0284c7",
        fontWeight: "bold",
        textTransform: "uppercase",
    },
    mathBox: {
        backgroundColor: "#f8fafc",
        padding: 12,
        borderRadius: 6,
        borderLeftWidth: 3,
        borderLeftColor: "#3b82f6",
    },
    mathRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 6,
    },
    mathText: {
        fontSize: 10,
        color: "#64748b",
    },
    mathValue: {
        fontSize: 10,
        fontWeight: "bold",
        color: "#334155",
    },
    qrBox: {
        alignItems: "center",
        justifyContent: "center",
        padding: 12,
        backgroundColor: "#ffffff",
        borderWidth: 1,
        borderColor: "#e2e8f0",
        borderRadius: 6,
    },
    qrImage: {
        width: 80,
        height: 80,
        marginBottom: 8,
    },
    qrPlaceholder: {
        width: 80,
        height: 80,
        backgroundColor: "#f1f5f9",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 8,
        borderRadius: 4,
    },
    qrPlaceholderText: {
        fontSize: 8,
        color: "#94a3b8",
        textAlign: "center",
    },
    qrLinkText: {
        fontSize: 8,
        color: "#64748b",
    },
    // Final Page Premium Styles
    summaryHeaderBox: {
        backgroundColor: "#f8fafc",
        padding: 16,
        borderRadius: 8,
        marginBottom: 24,
        borderLeftWidth: 4,
        borderLeftColor: "#3b82f6",
    },
    tableContainer: {
        borderWidth: 1,
        borderColor: "#e2e8f0",
        borderRadius: 8,
        overflow: "hidden",
        marginBottom: 24,
    },
    premiumTableHeader: {
        flexDirection: "row",
        backgroundColor: "#f1f5f9",
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#cbd5e1",
    },
    premiumTableRow: {
        flexDirection: "row",
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#f1f5f9",
    },
    totalsContainer: {
        width: "60%",
        alignSelf: "flex-end",
        backgroundColor: "#f8fafc",
        padding: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#e2e8f0",
        marginBottom: 10,
    },
    totalsRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 8,
    },
    totalsLabel: {
        fontSize: 10,
        color: "#64748b",
        flex: 2,
        textAlign: "right",
        paddingRight: 10,
    },
    totalsValue: {
        fontSize: 10,
        color: "#334155",
        flex: 1,
        textAlign: "right",
        fontWeight: "bold",
    },
    divider: {
        height: 1,
        backgroundColor: "#e2e8f0",
        marginVertical: 10,
    },
    // Signature Block Styles
    signatureContainer: {
        marginTop: 60,
        flexDirection: "row",
        justifyContent: "space-between",
        borderTopWidth: 1,
        borderTopColor: "#e2e8f0",
        paddingTop: 40,
    },
    signatureBlock: {
        width: "30%",
        alignItems: "center",
    },
    signatureLine: {
        width: "100%",
        height: 1,
        backgroundColor: "#94a3b8",
        marginBottom: 8,
    },
    signatureLabel: {
        fontSize: 9,
        color: "#64748b",
        fontWeight: "bold",
        textTransform: "uppercase",
    },
    bankDetailsBox: {
        backgroundColor: "#f8fafc",
        padding: 16,
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: "#22c55e", // Green accent for payments
        marginTop: 20,
        marginBottom: 20,
    },
    bankDetailsTitle: {
        fontSize: 10,
        fontWeight: "bold",
        color: "#0f172a",
        marginBottom: 8,
        textTransform: "uppercase",
    },
    bankDetailsRow: {
        flexDirection: "row",
        marginBottom: 4,
    },
    bankDetailsLabel: {
        width: 100,
        fontSize: 9,
        color: "#64748b",
    },
    bankDetailsValue: {
        fontSize: 9,
        color: "#0f172a",
        fontWeight: "bold",
    },
    // Compact Item Grid Styles
    compactItemContainer: {
        flexDirection: "row",
        marginBottom: 15,
        padding: 10,
        backgroundColor: "#f8fafc",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#e2e8f0",
    },
    compactItemImage: {
        width: 100,
        height: 100,
        objectFit: "cover",
        borderRadius: 6,
    },
    compactItemContent: {
        flex: 1,
        marginLeft: 12,
    },
    compactItemHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 4,
    },
    compactItemTitle: {
        fontSize: 12,
        fontWeight: "bold",
        color: "#0f172a",
        flex: 1,
    },
    compactItemCode: {
        fontSize: 8,
        color: "#64748b",
        fontFamily: "Courier",
        backgroundColor: "#f1f5f9",
        padding: 2,
    },
    compactItemSpecs: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginTop: 6,
    },
    compactSpecItem: {
        width: "30%",
        marginBottom: 6,
    },
    compactItemQR: {
        width: 60,
        height: 60,
        marginLeft: 10,
        alignItems: "center",
        justifyContent: "center",
        borderLeftWidth: 1,
        borderLeftColor: "#e2e8f0",
        paddingLeft: 10,
    },
    compactQRImage: {
        width: 50,
        height: 50,
    }
});

interface QuotePDFProps extends React.ComponentProps<typeof Document> {
    quoteNumber: string;
    date: string;
    clientName: string;
    clientEmail: string;
    clientPhone?: string;
    eventProjectName?: string;
    letterheadHeaderUrl?: string | null;
    letterheadFooterUrl?: string | null;
    currencySymbol?: string;
    platformName?: string;
    footerLegalText?: string;
    quoteTitle?: string;
    items: Array<{
        name: string;
        itemCode?: string;
        shortDescription: string;
        thumbnailUrl: string;
        dimensions: string;
        powerRequirements: string;
        weight: string;
        quantity: number;
        startDate: string;
        endDate: string;
        pricePerDay: number | string;
        totalLinePrice: number | string;
        material?: string;
        certifications?: string[];
        smartTags?: string[];
        qrCodeUrl?: string;
        modelLink?: string;
    }>;
    financials: {
        subtotal: number | string;
        logisticsCost: number | string;
        setupLaborCost: number | string;
        discount: number;
        tax: number;
        grandTotal: number | string;
    };
    termsAndConditions: string[];
    customNotes?: string;
    bankDetails?: {
        bankName: string;
        accountName: string;
        accountNumber: string;
        iban: string;
        swift: string;
    } | null;
    paymentTerms?: string | null;
}

export function QuotePDFTemplate({
    quoteNumber,
    date,
    clientName,
    clientEmail,
    clientPhone,
    eventProjectName,
    letterheadHeaderUrl,
    letterheadFooterUrl,
    currencySymbol = "QAR",
    platformName = "E3 Rentals",
    footerLegalText = "Generated automatically • Confidential Tender Document",
    quoteTitle = "Standard Rental Proposal",
    items,
    financials,
    termsAndConditions,
    customNotes,
    bankDetails,
    paymentTerms,
    ...documentProps
}: QuotePDFProps) {

    // Shared Header/Footer components that inject on EVERY page
    const renderHeader = () => (
        letterheadHeaderUrl ? (
            <Image src={letterheadHeaderUrl} style={styles.headerOverlay} fixed />
        ) : null
    );

    const renderFooter = () => (
        letterheadFooterUrl ? (
            <Image src={letterheadFooterUrl} style={styles.footerOverlay} fixed />
        ) : (
            <View style={[styles.footerOverlay, { paddingHorizontal: 40, paddingTop: 20, borderTopWidth: 1, borderTopColor: "#e2e8f0" }]} fixed>
                <Text style={{ fontSize: 8, color: "#94a3b8", textAlign: "center" }}>{platformName} • {footerLegalText}</Text>
            </View>
        )
    );

    return (
        <Document {...documentProps}>
            {/* MAIN CONTENT FLOW: HEADER -> CLIENT INFO -> COMPACT ITEMS -> SUMMARIES */}
            <Page size="A4" style={styles.page}>
                {renderHeader()}

                {/* 1. Header & Client Details */}
                <View style={styles.section}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", borderBottomWidth: 1, borderBottomColor: "#e2e8f0", paddingBottom: 10, marginBottom: 15 }}>
                        <View>
                            <Text style={[styles.title, { marginBottom: 0 }]}>{quoteTitle}</Text>
                            <Text style={{ fontSize: 10, color: "#64748b" }}>Ref: #{quoteNumber} | {date}</Text>
                        </View>
                        <View style={{ alignItems: "flex-end" }}>
                            <Text style={styles.label}>Event / Project</Text>
                            <Text style={[styles.value, { marginBottom: 0 }]}>{eventProjectName || "Standard Rental"}</Text>
                        </View>
                    </View>

                    <View style={styles.grid2}>
                        <View style={styles.col}>
                            <Text style={styles.label}>Prepared For</Text>
                            <Text style={[styles.value, { fontSize: 14 }]}>{clientName}</Text>
                            <Text style={styles.text}>{clientEmail} {clientPhone ? `| ${clientPhone}` : ""}</Text>
                        </View>
                        {customNotes && (
                            <View style={[styles.col, { backgroundColor: "#f8fafc", padding: 8, borderRadius: 4 }]}>
                                <Text style={styles.label}>Proposal Notes</Text>
                                <Text style={[styles.text, { fontSize: 8 }]}>{customNotes}</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* 2. Compact Items Section */}
                <View style={styles.section}>
                    <Text style={[styles.label, { marginBottom: 8, color: "#0f172a" }]}>Equipment Specifications & Media</Text>
                    {items.map((item, idx) => (
                        <View key={idx} style={styles.compactItemContainer} wrap={false}>
                            {item.thumbnailUrl && <Image src={item.thumbnailUrl} style={styles.compactItemImage} />}
                            <View style={styles.compactItemContent}>
                                <View style={styles.compactItemHeader}>
                                    <Text style={styles.compactItemTitle}>{item.name}</Text>
                                    {item.itemCode && <Text style={styles.compactItemCode}>{item.itemCode}</Text>}
                                </View>
                                <Text style={[styles.text, { fontSize: 8, marginBottom: 6 }]}>
                                    {item.shortDescription}
                                </Text>
                                <View style={styles.compactItemSpecs}>
                                    <View style={styles.compactSpecItem}>
                                        <Text style={styles.label}>Dimensions</Text>
                                        <Text style={[styles.text, { fontSize: 9, fontWeight: "bold" }]}>{item.dimensions || "N/A"}</Text>
                                    </View>
                                    <View style={styles.compactSpecItem}>
                                        <Text style={styles.label}>Power</Text>
                                        <Text style={[styles.text, { fontSize: 9, fontWeight: "bold" }]}>{item.powerRequirements || "N/A"}</Text>
                                    </View>
                                    <View style={styles.compactSpecItem}>
                                        <Text style={styles.label}>Weight</Text>
                                        <Text style={[styles.text, { fontSize: 9, fontWeight: "bold" }]}>{item.weight || "N/A"}</Text>
                                    </View>
                                    <View style={styles.compactSpecItem}>
                                        <Text style={styles.label}>Quantity</Text>
                                        <Text style={[styles.text, { fontSize: 9, fontWeight: "bold" }]}>{item.quantity} Units</Text>
                                    </View>
                                    <View style={styles.compactSpecItem}>
                                        <Text style={styles.label}>Line Total</Text>
                                        <Text style={[styles.text, { fontSize: 9, fontWeight: "bold", color: "#0f172a" }]}>{typeof item.totalLinePrice === 'number' ? `${item.totalLinePrice.toLocaleString()} ${currencySymbol}` : item.totalLinePrice}</Text>
                                    </View>
                                </View>
                            </View>
                            <View style={styles.compactItemQR}>
                                {item.qrCodeUrl && <Image src={item.qrCodeUrl} style={styles.compactQRImage} />}
                                <Text style={{ fontSize: 6, color: "#64748b", marginTop: 4, textAlign: "center", fontWeight: "bold" }}>SCAN 3D</Text>
                            </View>
                        </View>
                    ))}
                </View>

                {/* 3. Financial Summary */}
                <View style={{ marginTop: 10 }}>
                    <View style={[styles.totalsContainer, { width: "100%", flexDirection: "row", justifyContent: "space-between", alignItems: "center" }]}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>Commercial Breakdown</Text>
                            <View style={{ flexDirection: "row", gap: 15, marginTop: 4 }}>
                                <Text style={styles.text}>Subtotal: {typeof financials.subtotal === 'number' ? financials.subtotal.toLocaleString() : financials.subtotal}</Text>
                                <Text style={styles.text}>Logistics: {typeof financials.logisticsCost === 'number' ? financials.logisticsCost.toLocaleString() : financials.logisticsCost}</Text>
                                {financials.discount > 0 && <Text style={[styles.text, { color: "#ef4444" }]}>Disc: -{financials.discount}%</Text>}
                            </View>
                        </View>
                        <View style={[styles.grandTotalBox, { marginTop: 0, padding: 12, minWidth: 200 }]}>
                            <Text style={[styles.grandTotalLabel, { fontSize: 9 }]}>Total Payable Value</Text>
                            <Text style={[styles.grandTotalValue, { fontSize: 16 }]}>{typeof financials.grandTotal === 'number' ? financials.grandTotal.toLocaleString() : financials.grandTotal} {currencySymbol}</Text>
                        </View>
                    </View>
                </View>

                {/* 4. Bank Details & Terms */}
                <View style={{ flexDirection: "row", gap: 15, marginTop: 15 }}>
                    {bankDetails && (
                        <View style={[styles.bankDetailsBox, { flex: 1, marginTop: 0, padding: 10 }]}>
                            <Text style={styles.bankDetailsTitle}>Bank Remittance</Text>
                            <Text style={[styles.text, { fontSize: 8 }]}>{bankDetails.bankName} | Acc: {bankDetails.accountNumber}</Text>
                            <Text style={[styles.text, { fontSize: 8 }]}>IBAN: {bankDetails.iban}</Text>
                        </View>
                    )}
                    <View style={[styles.termsBox, { flex: 1, marginTop: 0, paddingTop: 0, borderTopWidth: 0 }]}>
                        <Text style={[styles.label, { fontSize: 8, color: "#0f172a" }]}>Terms & Conditions</Text>
                        {termsAndConditions.slice(0, 4).map((term, idx) => (
                            <Text key={idx} style={[styles.termsText, { fontSize: 7 }]}>{idx + 1}. {term}</Text>
                        ))}
                    </View>
                </View>

                {/* 5. Signature Block */}
                <View style={[styles.signatureContainer, { marginTop: 30, paddingTop: 20 }]}>
                    <View style={styles.signatureBlock}>
                        <View style={styles.signatureLine} />
                        <Text style={styles.signatureLabel}>Authorized Signature</Text>
                    </View>
                    <View style={styles.signatureBlock}>
                        <View style={styles.signatureLine} />
                        <Text style={styles.signatureLabel}>Date & Stamp</Text>
                    </View>
                </View>

                {renderFooter()}
            </Page>
        </Document>
    );
}
