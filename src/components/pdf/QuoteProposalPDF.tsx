import React from "react";
import { Document, Page, Text, View, StyleSheet, Image, Font } from "@react-pdf/renderer";

// Define strict A4 dimensions and premium typography
const styles = StyleSheet.create({
    page: {
        flexDirection: "column",
        backgroundColor: "#FFFFFF",
        padding: 40,
    },
    // Header Branding
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        borderBottomWidth: 2,
        borderBottomColor: "#0f172a",
        paddingBottom: 20,
        marginBottom: 30,
    },
    logoPlaceholder: {
        width: 120,
        height: 60,
        backgroundColor: "#0f172a",
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 4,
    },
    logoText: {
        color: "#fbbf24", // Gold
        fontSize: 18,
        fontWeight: "bold",
        letterSpacing: 2,
    },
    quoteInfo: {
        alignItems: "flex-end",
    },
    quoteTitle: {
        fontSize: 22,
        fontWeight: "bold",
        color: "#0f172a",
        textTransform: "uppercase",
        letterSpacing: 1,
    },
    quoteMeta: {
        fontSize: 9,
        color: "#64748b",
        marginTop: 4,
    },

    // Stakeholders
    stakeholders: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 40,
    },
    stakeholderCol: {
        width: "45%",
    },
    label: {
        fontSize: 8,
        color: "#94a3b8",
        fontWeight: "bold",
        textTransform: "uppercase",
        marginBottom: 6,
    },
    value: {
        fontSize: 10,
        color: "#0f172a",
        fontWeight: "bold",
    },
    subValue: {
        fontSize: 9,
        color: "#64748b",
        marginTop: 2,
    },

    // Table
    table: {
        marginTop: 10,
    },
    tableHeader: {
        flexDirection: "row",
        backgroundColor: "#f8fafc",
        borderBottomWidth: 1,
        borderBottomColor: "#e2e8f0",
        paddingVertical: 8,
        paddingHorizontal: 10,
    },
    tableRow: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: "#f1f5f9",
        paddingVertical: 12,
        paddingHorizontal: 10,
        alignItems: "center",
    },
    th: {
        fontSize: 8,
        fontWeight: "bold",
        color: "#64748b",
        textTransform: "uppercase",
    },
    td: {
        fontSize: 9,
        color: "#334155",
    },
    colDesc: { flex: 4 },
    colQty: { flex: 1, textAlign: "center" },
    colPrice: { flex: 2, textAlign: "right" },
    colTotal: { flex: 2, textAlign: "right" },

    // Financial Summary
    summaryContainer: {
        flexDirection: "row",
        justifyContent: "flex-end",
        marginTop: 30,
    },
    summaryBox: {
        width: "40%",
        padding: 15,
        backgroundColor: "#f8fafc",
        borderRadius: 8,
    },
    summaryRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 8,
    },
    summaryLabel: {
        fontSize: 9,
        color: "#64748b",
    },
    summaryValue: {
        fontSize: 9,
        fontWeight: "bold",
        color: "#0f172a",
    },
    grandTotalRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: "#e2e8f0",
    },
    grandTotalLabel: {
        fontSize: 11,
        fontWeight: "bold",
        color: "#0f172a",
        textTransform: "uppercase",
    },
    grandTotalValue: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#fbbf24", // Gold
    },

    // Footer & Compliance
    footer: {
        position: "absolute",
        bottom: 40,
        left: 40,
        right: 40,
    },
    legalTerms: {
        borderTopWidth: 1,
        borderTopColor: "#f1f5f9",
        paddingTop: 20,
        marginBottom: 20,
    },
    termsTitle: {
        fontSize: 9,
        fontWeight: "bold",
        color: "#0f172a",
        marginBottom: 8,
    },
    termsText: {
        fontSize: 8,
        color: "#94a3b8",
        lineHeight: 1.5,
    },
    bankDetails: {
        flexDirection: "row",
        justifyContent: "space-between",
        backgroundColor: "#f1f5f9",
        padding: 12,
        borderRadius: 6,
    },
    bankCol: {
        width: "48%",
    },
    bankLabel: {
        fontSize: 7,
        color: "#64748b",
        fontWeight: "bold",
        textTransform: "uppercase",
    },
    bankValue: {
        fontSize: 8,
        fontWeight: "bold",
        color: "#0f172a",
        marginTop: 2,
    },
});

interface QuoteProposalPDFProps {
    booking: any;
    financials: {
        subtotal: number;
        discount: number;
        logistics: number;
        setup: number;
        total: number;
    };
    paymentTerms: string;
}

export function QuoteProposalPDF({ booking, financials, paymentTerms }: QuoteProposalPDFProps) {
    const today = new Date().toLocaleDateString("en-QA", { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });

    return (
        <Document title={`E3 Proposal - ${booking.id}`}>
            <Page size="A4" style={styles.page}>
                {/* Header Branding */}
                <View style={styles.header}>
                    <View style={styles.logoPlaceholder}>
                        <Text style={styles.logoText}>E3 RENTALS</Text>
                    </View>
                    <View style={styles.quoteInfo}>
                        <Text style={styles.quoteTitle}>Commercial Proposal</Text>
                        <Text style={styles.quoteMeta}>Reference: #BK-{booking.id.slice(0, 8).toUpperCase()}</Text>
                        <Text style={styles.quoteMeta}>Date: {today}</Text>
                    </View>
                </View>

                {/* Stakeholders */}
                <View style={styles.stakeholders}>
                    <View style={styles.stakeholderCol}>
                        <Text style={styles.label}>Requested By</Text>
                        <Text style={styles.value}>{booking.customerName}</Text>
                        <Text style={styles.subValue}>{booking.customerEmail}</Text>
                        <Text style={styles.subValue}>{booking.customerPhone}</Text>
                    </View>
                    <View style={styles.stakeholderCol}>
                        <Text style={styles.label}>Project / Event</Text>
                        <Text style={styles.value}>{booking.projectName || "Standard Rental Service"}</Text>
                        <Text style={styles.subValue}>E3 Operations Team • Doha, Qatar</Text>
                    </View>
                </View>

                {/* Table */}
                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.th, styles.colDesc]}>Description</Text>
                        <Text style={[styles.th, styles.colQty]}>Qty</Text>
                        <Text style={[styles.th, styles.colPrice]}>Daily Rate</Text>
                        <Text style={[styles.th, styles.colTotal]}>Net Line</Text>
                    </View>

                    <View style={styles.tableRow}>
                        <Text style={[styles.td, styles.colDesc]}>{booking.product?.name || "Rental Asset"}</Text>
                        <Text style={[styles.td, styles.colQty]}>{booking.units || 1}</Text>
                        <Text style={[styles.td, styles.colPrice]}>QAR {booking.product?.pricePerDay?.toLocaleString()}</Text>
                        <Text style={[styles.td, styles.colTotal]}>QAR {financials.subtotal.toLocaleString()}</Text>
                    </View>
                </View>

                {/* Financial Summary */}
                <View style={styles.summaryContainer}>
                    <View style={styles.summaryBox}>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Sub-total</Text>
                            <Text style={styles.summaryValue}>QAR {financials.subtotal.toLocaleString()}</Text>
                        </View>
                        {financials.discount > 0 && (
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Applied Discount ({financials.discount}%)</Text>
                                <Text style={[styles.summaryValue, { color: "#ef4444" }]}>- QAR {((financials.subtotal * financials.discount) / 100).toLocaleString()}</Text>
                            </View>
                        )}
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Logistics / Transport</Text>
                            <Text style={styles.summaryValue}>QAR {financials.logistics.toLocaleString()}</Text>
                        </View>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Setup / Labor Fee</Text>
                            <Text style={styles.summaryValue}>QAR {financials.setup.toLocaleString()}</Text>
                        </View>
                        <View style={styles.grandTotalRow}>
                            <Text style={styles.grandTotalLabel}>Grand Total</Text>
                            <Text style={styles.grandTotalValue}>QAR {financials.total.toLocaleString()}</Text>
                        </View>
                    </View>
                </View>

                {/* Footer & Compliance */}
                <View style={styles.footer}>
                    <View style={styles.legalTerms}>
                        <Text style={styles.termsTitle}>MOCI Compliant Payment & Legal Terms</Text>
                        <Text style={styles.termsText}>
                            1. Payment Policy: This quote is subject to the "{paymentTerms}" payment term agreed during commercial negotiations.
                        </Text>
                        <Text style={styles.termsText}>
                            2. Validity: This proposal is valid for 7 working days from the date of issuance.
                        </Text>
                        <Text style={styles.termsText}>
                            3. Regulatory Compliance: All services provided by E3 Rentals adhere to the labor and commercial laws of the State of Qatar.
                        </Text>
                    </View>

                    <View style={styles.bankDetails}>
                        <View style={styles.bankCol}>
                            <Text style={styles.bankLabel}>Bank Name</Text>
                            <Text style={styles.bankValue}>Qatar National Bank (QNB)</Text>
                        </View>
                        <View style={styles.bankCol}>
                            <Text style={styles.bankLabel}>IBAN Number</Text>
                            <Text style={styles.bankValue}>QA12 QNBA 0000 0000 1234 5678 9012</Text>
                        </View>
                    </View>

                    <View style={{ marginTop: 20, borderTopWidth: 1, borderTopColor: "#f1f5f9", paddingTop: 10, alignItems: "center" }}>
                        <Text style={{ fontSize: 7, color: "#cbd5e1", textTransform: "uppercase" }}>
                            Document digitally generated by E3 Logistics ERP • Secure Negotiated Quote
                        </Text>
                    </View>
                </View>
            </Page>
        </Document>
    );
}
