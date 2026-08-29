import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
    page: {
        flexDirection: "column",
        backgroundColor: "#FFFFFF",
        padding: 40,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        borderBottomWidth: 2,
        borderBottomColor: "#0f172a",
        paddingBottom: 20,
        marginBottom: 25,
    },
    logoPlaceholder: {
        width: 120,
        height: 50,
        backgroundColor: "#0f172a",
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 4,
    },
    logoText: {
        color: "#fbbf24",
        fontSize: 16,
        fontWeight: "bold",
        letterSpacing: 2,
    },
    quoteInfo: {
        alignItems: "flex-end",
    },
    quoteTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#0f172a",
        textTransform: "uppercase",
        letterSpacing: 1,
    },
    quoteMeta: {
        fontSize: 8,
        color: "#64748b",
        marginTop: 3,
    },

    stakeholders: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 25,
    },
    stakeholderCol: {
        width: "48%",
    },
    label: {
        fontSize: 7,
        color: "#94a3b8",
        fontWeight: "bold",
        textTransform: "uppercase",
        marginBottom: 4,
    },
    value: {
        fontSize: 9,
        color: "#0f172a",
        fontWeight: "bold",
    },
    subValue: {
        fontSize: 8,
        color: "#64748b",
        marginTop: 2,
    },

    // Table
    table: {
        marginTop: 5,
        marginBottom: 15,
    },
    tableHeader: {
        flexDirection: "row",
        backgroundColor: "#f8fafc",
        borderBottomWidth: 1,
        borderBottomColor: "#e2e8f0",
        paddingVertical: 6,
        paddingHorizontal: 8,
    },
    tableRow: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: "#f1f5f9",
        paddingVertical: 8,
        paddingHorizontal: 8,
        alignItems: "center",
    },
    th: {
        fontSize: 7,
        fontWeight: "bold",
        color: "#64748b",
        textTransform: "uppercase",
    },
    td: {
        fontSize: 8,
        color: "#334155",
    },
    colDesc: { flex: 4 },
    colQty: { flex: 1, textAlign: "center" },
    colDays: { flex: 1, textAlign: "center" },
    colPrice: { flex: 1.5, textAlign: "right" },
    colTotal: { flex: 2, textAlign: "right" },

    // Financial Summary
    summaryContainer: {
        flexDirection: "row",
        justifyContent: "flex-end",
        marginTop: 15,
        marginBottom: 20,
    },
    summaryBox: {
        width: "48%",
        padding: 12,
        backgroundColor: "#f8fafc",
        borderRadius: 6,
        borderWidth: 1,
        borderColor: "#e2e8f0",
    },
    summaryRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 6,
    },
    summaryLabel: {
        fontSize: 8,
        color: "#64748b",
    },
    summaryValue: {
        fontSize: 8,
        fontWeight: "bold",
        color: "#0f172a",
    },
    grandTotalRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: "#cbd5e1",
    },
    grandTotalLabel: {
        fontSize: 10,
        fontWeight: "bold",
        color: "#0f172a",
        textTransform: "uppercase",
    },
    grandTotalValue: {
        fontSize: 12,
        fontWeight: "bold",
        color: "#d97706",
    },

    // Footer & Legal
    legalTerms: {
        borderTopWidth: 1,
        borderTopColor: "#f1f5f9",
        paddingTop: 12,
        marginBottom: 12,
    },
    termsTitle: {
        fontSize: 8,
        fontWeight: "bold",
        color: "#0f172a",
        marginBottom: 4,
    },
    termsText: {
        fontSize: 7,
        color: "#64748b",
        lineHeight: 1.4,
        marginBottom: 2,
    },
    bankDetails: {
        flexDirection: "row",
        justifyContent: "space-between",
        backgroundColor: "#f1f5f9",
        padding: 8,
        borderRadius: 4,
        marginTop: 8,
    },
    bankCol: {
        width: "48%",
    },
    bankLabel: {
        fontSize: 6,
        color: "#64748b",
        fontWeight: "bold",
        textTransform: "uppercase",
    },
    bankValue: {
        fontSize: 7,
        fontWeight: "bold",
        color: "#0f172a",
        marginTop: 1,
    },
    bottomBranding: {
        marginTop: 12,
        alignItems: "center",
    },
    bottomText: {
        fontSize: 6,
        color: "#94a3b8",
        textTransform: "uppercase",
        letterSpacing: 1,
    },
});

interface LineItem {
    name?: string;
    product?: { name: string; pricePerDay: number };
    units?: number;
    days?: number;
    unitPrice?: number;
    rentalTotal?: number;
    startDate?: string | Date;
    endDate?: string | Date;
}

interface QuoteProposalPDFProps {
    booking: any;
    financials: {
        items?: LineItem[];
        subtotal?: number;
        baseRentalSubtotal?: number;
        discount?: number;
        discountPercent?: number;
        discountAmount?: number;
        logistics?: number;
        logisticsCost?: number;
        setup?: number;
        laborCost?: number;
        total?: number;
        grandTotal?: number;
    };
    paymentTerms?: string;
}

export function QuoteProposalPDF({ booking, financials, paymentTerms = "100% Advance" }: QuoteProposalPDFProps) {
    const today = new Date().toLocaleDateString("en-QA", { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });

    const items: LineItem[] = financials.items || booking.items || [booking];
    const subtotal = financials.baseRentalSubtotal ?? financials.subtotal ?? 0;
    const discountAmount = financials.discountAmount ?? ((subtotal * (financials.discount || financials.discountPercent || 0)) / 100);
    const logistics = financials.logisticsCost ?? financials.logistics ?? 0;
    const labor = financials.laborCost ?? financials.setup ?? 0;
    const grandTotal = financials.grandTotal ?? financials.total ?? Math.max(0, subtotal - discountAmount + logistics + labor);

    const refId = (booking.projectId || booking.id || "00000000").slice(0, 8).toUpperCase();

    return (
        <Document title={`E3_Proposal_${refId}`}>
            <Page size="A4" style={styles.page}>
                {/* Header Branding */}
                <View style={styles.header}>
                    <View style={styles.logoPlaceholder}>
                        <Text style={styles.logoText}>E3 RENTALS</Text>
                    </View>
                    <View style={styles.quoteInfo}>
                        <Text style={styles.quoteTitle}>Commercial Proposal</Text>
                        <Text style={styles.quoteMeta}>Proposal Reference: #BK-{refId}</Text>
                        <Text style={styles.quoteMeta}>Date Issued: {today}</Text>
                        <Text style={styles.quoteMeta}>Status: {String(booking.status || 'Active').toUpperCase().replace('_', ' ')}</Text>
                    </View>
                </View>

                {/* Stakeholders */}
                <View style={styles.stakeholders}>
                    <View style={styles.stakeholderCol}>
                        <Text style={styles.label}>Client / Entity</Text>
                        <Text style={styles.value}>{booking.customerName || "Authorized Client"}</Text>
                        <Text style={styles.subValue}>{booking.customerEmail || ""}</Text>
                        {booking.customerPhone && <Text style={styles.subValue}>{booking.customerPhone}</Text>}
                    </View>
                    <View style={styles.stakeholderCol}>
                        <Text style={styles.label}>Project Identity</Text>
                        <Text style={styles.value}>{booking.projectName || "Event Production Logistics"}</Text>
                        <Text style={styles.subValue}>E3 Logistics ERP • Doha, State of Qatar</Text>
                    </View>
                </View>

                {/* Line Items Table */}
                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.th, styles.colDesc]}>Description</Text>
                        <Text style={[styles.th, styles.colQty]}>Qty</Text>
                        <Text style={[styles.th, styles.colDays]}>Days</Text>
                        <Text style={[styles.th, styles.colPrice]}>Rate/Day</Text>
                        <Text style={[styles.th, styles.colTotal]}>Net Line</Text>
                    </View>

                    {items.map((item, idx) => {
                        const itemName = item.name || item.product?.name || "Rental Asset";
                        const qty = item.units || 1;
                        const days = item.days || 1;
                        const rate = item.unitPrice ?? item.product?.pricePerDay ?? 0;
                        const lineTotal = item.rentalTotal ?? (rate * qty * days);

                        return (
                            <View key={idx} style={styles.tableRow}>
                                <Text style={[styles.td, styles.colDesc]}>{itemName}</Text>
                                <Text style={[styles.td, styles.colQty]}>{qty}</Text>
                                <Text style={[styles.td, styles.colDays]}>{days}</Text>
                                <Text style={[styles.td, styles.colPrice]}>QAR {rate.toLocaleString()}</Text>
                                <Text style={[styles.td, styles.colTotal]}>QAR {lineTotal.toLocaleString()}</Text>
                            </View>
                        );
                    })}
                </View>

                {/* Financial Summary */}
                <View style={styles.summaryContainer}>
                    <View style={styles.summaryBox}>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Base Rental Subtotal</Text>
                            <Text style={styles.summaryValue}>QAR {subtotal.toLocaleString()}</Text>
                        </View>
                        {discountAmount > 0 && (
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Applied Discount</Text>
                                <Text style={[styles.summaryValue, { color: "#ef4444" }]}>- QAR {discountAmount.toLocaleString()}</Text>
                            </View>
                        )}
                        {logistics > 0 && (
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Logistics & Transport</Text>
                                <Text style={styles.summaryValue}>+ QAR {logistics.toLocaleString()}</Text>
                            </View>
                        )}
                        {labor > 0 && (
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Setup & Labor</Text>
                                <Text style={styles.summaryValue}>+ QAR {labor.toLocaleString()}</Text>
                            </View>
                        )}
                        <View style={styles.grandTotalRow}>
                            <Text style={styles.grandTotalLabel}>Grand Total (QAR)</Text>
                            <Text style={styles.grandTotalValue}>QAR {grandTotal.toLocaleString()}</Text>
                        </View>
                    </View>
                </View>

                {/* Footer Legal & Banking */}
                <View style={styles.legalTerms}>
                    <Text style={styles.termsTitle}>Commercial Agreement & Terms</Text>
                    <Text style={styles.termsText}>
                        1. Payment Terms: This commercial quote is governed by the agreed term: "{paymentTerms}".
                    </Text>
                    <Text style={styles.termsText}>
                        2. Validity: Official proposals are valid for 7 working days from issuance. Stock reservations require formal digital approval.
                    </Text>
                    <Text style={styles.termsText}>
                        3. Regulatory Compliance: Compliant with Ministry of Commerce & Industry (MOCI) and Qatar Civil Defence safety regulations.
                    </Text>
                </View>

                <View style={styles.bankDetails}>
                    <View style={styles.bankCol}>
                        <Text style={styles.bankLabel}>Bank Name</Text>
                        <Text style={styles.bankValue}>Qatar National Bank (QNB)</Text>
                    </View>
                    <View style={styles.bankCol}>
                        <Text style={styles.bankLabel}>IBAN</Text>
                        <Text style={styles.bankValue}>QA12 QNBA 0000 0000 1234 5678 9012</Text>
                    </View>
                </View>

                <View style={styles.bottomBranding}>
                    <Text style={styles.bottomText}>
                        Generated securely by E3 Logistics ERP • Multi-Tenant Event Operating System
                    </Text>
                </View>
            </Page>
        </Document>
    );
}
