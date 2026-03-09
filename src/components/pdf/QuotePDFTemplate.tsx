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
        pricePerDay: number;
        totalLinePrice: number;
    }>;
    financials: {
        subtotal: number;
        logisticsCost: number;
        setupLaborCost: number;
        discount: number;
        tax: number;
        grandTotal: number;
    };
    termsAndConditions: string[];
    customNotes?: string;
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
    items,
    financials,
    termsAndConditions,
    customNotes,
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
                <Text style={{ fontSize: 8, color: "#94a3b8", textAlign: "center" }}>Generated automatically by Rental Fleet OS • Confidential Tender Document</Text>
            </View>
        )
    );

    return (
        <Document {...documentProps}>
            {/* PAGE 1: COVER & INTRODUCTION */}
            <Page size="A4" style={styles.page}>
                {renderHeader()}

                <View style={styles.section}>
                    <Text style={styles.title}>Formal Rental Proposal</Text>
                    <Text style={styles.subtitle}>Reference: #{quoteNumber} | Date: {date}</Text>
                </View>

                <View style={styles.grid2}>
                    <View style={styles.col}>
                        <Text style={styles.label}>Prepared For</Text>
                        <Text style={styles.value}>{clientName}</Text>

                        <Text style={styles.label}>Contact</Text>
                        <Text style={styles.text}>{clientEmail}</Text>
                        {clientPhone && <Text style={styles.text}>{clientPhone}</Text>}
                    </View>
                    <View style={styles.col}>
                        <Text style={styles.label}>Event / Project Name</Text>
                        <Text style={styles.value}>{eventProjectName || "Standard Rental"}</Text>
                    </View>
                </View>

                {customNotes && (
                    <View style={[styles.section, styles.specBox]}>
                        <Text style={[styles.label, { marginBottom: 6 }]}>Proposal Notes</Text>
                        <Text style={styles.text}>{customNotes}</Text>
                    </View>
                )}

                <View style={[styles.section, { marginTop: 40 }]}>
                    <Text style={styles.text}>
                        Thank you for the opportunity to quote for your upcoming requirement.
                        Please find enclosed the formal specifications for the requested equipment,
                        followed by the finalized commercial breakdown.
                    </Text>
                </View>

                {renderFooter()}
            </Page>

            {/* MIDDLE PAGES: PRODUCT SPEC SHEETS (One product per page) */}
            {items.map((item, idx) => (
                <Page key={idx} size="A4" style={styles.page} wrap={false}>
                    {renderHeader()}

                    <Text style={[styles.title, { fontSize: 20 }]}>{item.name}</Text>
                    {item.itemCode && (
                        <Text style={{ fontSize: 9, color: "#94a3b8", fontFamily: "Courier", marginBottom: 8 }}>Item Code: {item.itemCode}</Text>
                    )}

                    {item.thumbnailUrl && (
                        <Image src={item.thumbnailUrl} style={styles.productHeroImage} />
                    )}

                    <View style={styles.section}>
                        <Text style={styles.text}>{item.shortDescription}</Text>
                    </View>

                    <View style={styles.specBox}>
                        <View style={styles.grid2}>
                            <View style={styles.col}>
                                <Text style={styles.label}>Dimensions</Text>
                                <Text style={styles.value}>{item.dimensions || "Standard"}</Text>

                                <Text style={styles.label}>Weight</Text>
                                <Text style={styles.value}>{item.weight || "N/A"}</Text>
                            </View>
                            <View style={styles.col}>
                                <Text style={styles.label}>Power Requirements</Text>
                                <Text style={styles.value}>{item.powerRequirements || "None"}</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.grid2}>
                        <View style={styles.col}>
                            <Text style={styles.label}>Rental Period</Text>
                            <Text style={styles.value}>{item.startDate} to {item.endDate}</Text>
                        </View>
                        <View style={styles.col}>
                            <Text style={styles.label}>Requested Quantity</Text>
                            <Text style={styles.value}>{item.quantity} Units</Text>
                        </View>
                    </View>

                    {renderFooter()}
                </Page>
            ))}

            {/* FINAL PAGE: FINANCIALS & TERMS */}
            <Page size="A4" style={styles.page}>
                {renderHeader()}

                <Text style={styles.title}>Financial Summary</Text>

                <View style={styles.section}>
                    {/* Header Row */}
                    <View style={styles.tableHeaderRow}>
                        <Text style={[styles.label, styles.tableColLeft]}>Description</Text>
                        <Text style={[styles.label, styles.tableColCenter]}>Qty</Text>
                        <Text style={[styles.label, styles.tableColRight]}>Daily Rate</Text>
                        <Text style={[styles.label, styles.tableColRight]}>Line Total</Text>
                    </View>

                    {/* Line Items */}
                    {items.map((item, idx) => (
                        <View key={idx} style={styles.tableRow}>
                            <View style={styles.tableColLeft}>
                                <Text style={[styles.text, { fontWeight: "bold" }]}>{item.name}</Text>
                                {item.itemCode && (
                                    <Text style={{ fontSize: 7, color: "#94a3b8", fontFamily: "Courier" }}>{item.itemCode}</Text>
                                )}
                                <Text style={{ fontSize: 8, color: "#64748b" }}>{item.startDate} to {item.endDate}</Text>
                            </View>
                            <Text style={[styles.text, styles.tableColCenter]}>{item.quantity}</Text>
                            <Text style={[styles.text, styles.tableColRight]}>{item.pricePerDay.toFixed(2)}</Text>
                            <Text style={[styles.text, styles.tableColRight]}>{item.totalLinePrice.toFixed(2)} QAR</Text>
                        </View>
                    ))}
                </View>

                <View style={{ width: "60%", alignSelf: "flex-end", marginTop: 20 }}>
                    <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
                        <Text style={[styles.text, { flex: 2, textAlign: "right" }]}>Equipment Subtotal:</Text>
                        <Text style={[styles.text, { flex: 1, textAlign: "right", fontWeight: "bold" }]}>{financials.subtotal.toFixed(2)} QAR</Text>
                    </View>
                    <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
                        <Text style={[styles.text, { flex: 2, textAlign: "right" }]}>Logistics & Transport:</Text>
                        <Text style={[styles.text, { flex: 1, textAlign: "right" }]}>{financials.logisticsCost.toFixed(2)} QAR</Text>
                    </View>
                    <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
                        <Text style={[styles.text, { flex: 2, textAlign: "right" }]}>Setup & Labor:</Text>
                        <Text style={[styles.text, { flex: 1, textAlign: "right" }]}>{financials.setupLaborCost.toFixed(2)} QAR</Text>
                    </View>
                    {financials.discount > 0 && (
                        <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
                            <Text style={[styles.text, { flex: 2, textAlign: "right", color: "#ef4444" }]}>Discount Applied:</Text>
                            <Text style={[styles.text, { flex: 1, textAlign: "right", color: "#ef4444" }]}>-{financials.discount.toFixed(2)} QAR</Text>
                        </View>
                    )}
                </View>

                {/* GRAND TOTAL */}
                <View style={styles.grandTotalBox}>
                    <Text style={styles.grandTotalLabel}>Grand Total (Qatari Riyals)</Text>
                    <Text style={styles.grandTotalValue}>{financials.grandTotal.toFixed(2)} QAR</Text>
                </View>

                {/* TERMS AND CONDITIONS */}
                {termsAndConditions && termsAndConditions.length > 0 && (
                    <View style={styles.termsBox}>
                        <Text style={[styles.label, { marginBottom: 8 }]}>Terms & Conditions</Text>
                        {termsAndConditions.map((term, idx) => (
                            <Text key={idx} style={styles.termsText}>• {term}</Text>
                        ))}
                    </View>
                )}

                {renderFooter()}
            </Page>
        </Document>
    );
}
