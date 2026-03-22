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

                    {/* HERO & TITLE SECTION */}
                    <View style={styles.heroSection}>
                        {item.thumbnailUrl && (
                            <Image src={item.thumbnailUrl} style={styles.productHeroImageLarge} />
                        )}
                        <View style={styles.productTitleBox}>
                            <Text style={styles.productTitle}>{item.name}</Text>
                            {item.itemCode && (
                                <Text style={styles.itemCode}>ITEM CODE: {item.itemCode}</Text>
                            )}
                        </View>
                    </View>

                    {/* BADGES / CERTIFICATIONS */}
                    <View style={styles.badgeContainer}>
                        {(item.smartTags && item.smartTags.length > 0) && item.smartTags.map((tag, tIdx) => (
                            <View key={`tag-${tIdx}`} style={[styles.badge, { backgroundColor: "#fef3c7" }]}>
                                <Text style={[styles.badgeText, { color: "#d97706" }]}>{tag}</Text>
                            </View>
                        ))}
                        {(item.certifications && item.certifications.length > 0) && item.certifications.map((cert, cIdx) => (
                            <View key={`cert-${cIdx}`} style={styles.badge}>
                                <Text style={styles.badgeText}>{cert}</Text>
                            </View>
                        ))}
                    </View>

                    {/* DESCRIPTION */}
                    <View style={styles.section}>
                        <Text style={styles.text}>{item.shortDescription}</Text>
                    </View>

                    {/* SPECIFICATIONS GRID */}
                    <View style={styles.specBox}>
                        <View style={styles.grid2}>
                            <View style={styles.col}>
                                <Text style={styles.label}>Dimensions</Text>
                                <Text style={styles.value}>{item.dimensions || "Standard"}</Text>

                                <Text style={styles.label}>Weight</Text>
                                <Text style={styles.value}>{item.weight || "N/A"}</Text>
                            </View>
                            <View style={styles.col}>
                                <Text style={styles.label}>Power</Text>
                                <Text style={styles.value}>{item.powerRequirements || "None"}</Text>

                                <Text style={styles.label}>Material</Text>
                                <Text style={styles.value}>{item.material || "Standard"}</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.grid2}>
                        {/* RENTAL MATH */}
                        <View style={[styles.col, styles.mathBox]}>
                            <Text style={styles.label}>Rental Breakdown</Text>
                            <View style={styles.mathRow}>
                                <Text style={styles.mathText}>Quantity Requested:</Text>
                                <Text style={styles.mathValue}>{item.quantity} Units</Text>
                            </View>
                            <View style={styles.mathRow}>
                                <Text style={styles.mathText}>Rental Duration:</Text>
                                <Text style={styles.mathValue}>{item.startDate} to {item.endDate}</Text>
                            </View>
                            <View style={styles.mathRow}>
                                <Text style={styles.mathText}>Line Item Total:</Text>
                                <Text style={[styles.mathValue, { color: "#0f172a" }]}>{typeof item.totalLinePrice === 'number' ? `${item.totalLinePrice.toFixed(2)} QAR` : item.totalLinePrice}</Text>
                            </View>
                        </View>
                        
                        {/* SMART MEDIA (QR) */}
                        <View style={[styles.col, styles.qrBox]}>
                            {item.qrCodeUrl ? (
                                <Image src={item.qrCodeUrl} style={styles.qrImage} />
                            ) : (
                                <View style={styles.qrPlaceholder}>
                                    <Text style={styles.qrPlaceholderText}>SCAN FOR{"\n"}3D VIEW</Text>
                                </View>
                            )}
                            <Text style={styles.qrLinkText}>
                                {item.modelLink || "Interactive Media Available"}
                            </Text>
                        </View>
                    </View>

                    {renderFooter()}
                </Page>
            ))}

            {/* FINAL PAGE: FINANCIALS & TERMS */}
            <Page size="A4" style={styles.page}>
                {renderHeader()}

                <View style={styles.summaryHeaderBox}>
                    <Text style={[styles.title, { marginBottom: 4 }]}>Commercial Summary</Text>
                    <Text style={styles.text}>Comprehensive breakdown of rental equipment, logistics, and additional services.</Text>
                </View>

                {/* PREMIUM TABLE */}
                <View style={styles.tableContainer}>
                    {/* Header Row */}
                    <View style={styles.premiumTableHeader}>
                        <Text style={[styles.label, styles.tableColLeft]}>Equipment Details</Text>
                        <Text style={[styles.label, styles.tableColCenter]}>Duration</Text>
                        <Text style={[styles.label, styles.tableColCenter]}>Qty</Text>
                        <Text style={[styles.label, styles.tableColRight]}>Line Total</Text>
                    </View>

                    {/* Line Items */}
                    {items.map((item, idx) => (
                        <View key={idx} style={styles.premiumTableRow}>
                            <View style={styles.tableColLeft}>
                                <Text style={[styles.text, { fontWeight: "bold", color: "#0f172a" }]}>{item.name}</Text>
                                {item.itemCode && (
                                    <Text style={{ fontSize: 7, color: "#64748b", fontFamily: "Courier", marginTop: 2 }}>REF: {item.itemCode}</Text>
                                )}
                            </View>
                            <Text style={[styles.text, styles.tableColCenter, { fontSize: 8 }]}>{item.startDate} - {item.endDate}</Text>
                            <Text style={[styles.text, styles.tableColCenter, { fontWeight: "bold" }]}>{item.quantity}</Text>
                            <Text style={[styles.text, styles.tableColRight, { fontWeight: "bold", color: "#0f172a" }]}>{typeof item.totalLinePrice === 'number' ? `${item.totalLinePrice.toFixed(2)} QAR` : item.totalLinePrice}</Text>
                        </View>
                    ))}
                </View>

                {/* DETAILED TOTALS */}
                <View style={styles.totalsContainer}>
                    <View style={styles.totalsRow}>
                        <Text style={styles.totalsLabel}>Equipment Subtotal:</Text>
                        <Text style={styles.totalsValue}>{typeof financials.subtotal === 'number' ? `${financials.subtotal.toFixed(2)} QAR` : financials.subtotal}</Text>
                    </View>
                    <View style={styles.totalsRow}>
                        <Text style={styles.totalsLabel}>Logistics & Transport:</Text>
                        <Text style={styles.totalsValue}>{typeof financials.logisticsCost === 'number' ? `${financials.logisticsCost.toFixed(2)} QAR` : financials.logisticsCost}</Text>
                    </View>
                    <View style={styles.totalsRow}>
                        <Text style={styles.totalsLabel}>Setup & Labor:</Text>
                        <Text style={styles.totalsValue}>{typeof financials.setupLaborCost === 'number' ? `${financials.setupLaborCost.toFixed(2)} QAR` : financials.setupLaborCost}</Text>
                    </View>
                    {financials.discount > 0 && (
                        <View style={styles.totalsRow}>
                            <Text style={[styles.totalsLabel, { color: "#ef4444" }]}>Discount Applied:</Text>
                            <Text style={[styles.totalsValue, { color: "#ef4444" }]}>-{financials.discount.toFixed(2)} QAR</Text>
                        </View>
                    )}
                    {(financials.tax && financials.tax > 0) ? (
                        <View style={styles.totalsRow}>
                            <Text style={styles.totalsLabel}>Taxes / VAT:</Text>
                            <Text style={styles.totalsValue}>{financials.tax.toFixed(2)} QAR</Text>
                        </View>
                    ) : null}
                    
                    <View style={styles.divider} />
                    
                    <View style={[styles.totalsRow, { marginBottom: 0, alignItems: "center" }]}>
                        <Text style={[styles.totalsLabel, { color: "#0f172a", fontWeight: "bold", fontSize: 12 }]}>Payable Subtotal:</Text>
                        <Text style={[styles.totalsValue, { color: "#0f172a", fontSize: 12 }]}>
                            {typeof financials.grandTotal === 'number' ? `${financials.grandTotal.toFixed(2)} QAR` : financials.grandTotal}
                        </Text>
                    </View>
                </View>

                {/* GRAND TOTAL CALLOUT */}
                <View style={[styles.grandTotalBox, { marginTop: 0 }]}>
                    <Text style={styles.grandTotalLabel}>Total Proposal Value (QAR)</Text>
                    <Text style={styles.grandTotalValue}>{typeof financials.grandTotal === 'number' ? financials.grandTotal.toFixed(2) : financials.grandTotal}</Text>
                </View>

                {/* BANK DETAILS INJECTION */}
                {bankDetails && (
                    <View style={styles.bankDetailsBox}>
                        <Text style={styles.bankDetailsTitle}>Bank Details for Payment</Text>
                        <View style={styles.bankDetailsRow}>
                            <Text style={styles.bankDetailsLabel}>Bank Name:</Text>
                            <Text style={styles.bankDetailsValue}>{bankDetails.bankName || "N/A"}</Text>
                        </View>
                        <View style={styles.bankDetailsRow}>
                            <Text style={styles.bankDetailsLabel}>Account Name:</Text>
                            <Text style={styles.bankDetailsValue}>{bankDetails.accountName || "N/A"}</Text>
                        </View>
                        <View style={styles.bankDetailsRow}>
                            <Text style={styles.bankDetailsLabel}>Account Number:</Text>
                            <Text style={styles.bankDetailsValue}>{bankDetails.accountNumber || "N/A"}</Text>
                        </View>
                        {bankDetails.iban && (
                            <View style={styles.bankDetailsRow}>
                                <Text style={styles.bankDetailsLabel}>IBAN:</Text>
                                <Text style={styles.bankDetailsValue}>{bankDetails.iban}</Text>
                            </View>
                        )}
                        {bankDetails.swift && (
                            <View style={styles.bankDetailsRow}>
                                <Text style={styles.bankDetailsLabel}>SWIFT Code:</Text>
                                <Text style={styles.bankDetailsValue}>{bankDetails.swift}</Text>
                            </View>
                        )}
                        {paymentTerms && (
                            <View style={[styles.bankDetailsRow, { marginTop: 8 }]}>
                                <Text style={styles.bankDetailsLabel}>Payment Terms:</Text>
                                <Text style={styles.bankDetailsValue}>{paymentTerms}</Text>
                            </View>
                        )}
                    </View>
                )}

                {/* TERMS AND CONDITIONS */}
                {termsAndConditions && termsAndConditions.length > 0 && (
                    <View style={[styles.termsBox, { marginTop: bankDetails ? 0 : 40 }]}>
                        <Text style={[styles.label, { marginBottom: 8, color: "#0f172a" }]}>Commercial Terms & Conditions</Text>
                        {termsAndConditions.map((term, idx) => (
                            <Text key={idx} style={styles.termsText}>{idx + 1}. {term}</Text>
                        ))}
                    </View>
                )}

                {/* PHYSICAL SIGNATURE BLOCK */}
                <View style={styles.signatureContainer} wrap={false}>
                    <View style={styles.signatureBlock}>
                        <View style={styles.signatureLine} />
                        <Text style={styles.signatureLabel}>Authorized Signature</Text>
                    </View>
                    <View style={styles.signatureBlock}>
                        <View style={styles.signatureLine} />
                        <Text style={styles.signatureLabel}>Date</Text>
                    </View>
                    <View style={styles.signatureBlock}>
                        <View style={styles.signatureLine} />
                        <Text style={styles.signatureLabel}>Company Stamp</Text>
                    </View>
                </View>

                {renderFooter()}
            </Page>
        </Document>
    );
}
