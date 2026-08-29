import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
    page: {
        flexDirection: "column",
        backgroundColor: "#FFFFFF",
        padding: 40,
        fontFamily: "Helvetica",
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        borderBottomWidth: 2,
        borderBottomColor: "#D4AF37", // Gold accent
        paddingBottom: 20,
        marginBottom: 20,
    },
    brandTitle: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#0B132B", // Navy
    },
    brandSubtitle: {
        fontSize: 10,
        color: "#64748B",
        marginTop: 4,
    },
    invoiceMeta: {
        alignItems: "flex-end",
    },
    invoiceTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#D4AF37",
    },
    invoiceNumber: {
        fontSize: 12,
        fontWeight: "bold",
        color: "#0B132B",
        marginTop: 4,
    },
    dateText: {
        fontSize: 9,
        color: "#64748B",
        marginTop: 2,
    },
    partySection: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 24,
    },
    partyBox: {
        width: "48%",
        backgroundColor: "#F8FAFC",
        padding: 12,
        borderRadius: 4,
    },
    partyLabel: {
        fontSize: 8,
        fontWeight: "bold",
        color: "#94A3B8",
        textTransform: "uppercase",
        marginBottom: 4,
    },
    partyName: {
        fontSize: 12,
        fontWeight: "bold",
        color: "#0B132B",
        marginBottom: 2,
    },
    partyText: {
        fontSize: 9,
        color: "#475569",
        lineHeight: 1.4,
    },
    table: {
        marginBottom: 20,
    },
    tableHeader: {
        flexDirection: "row",
        backgroundColor: "#0B132B",
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 4,
    },
    thText: {
        color: "#FFFFFF",
        fontSize: 9,
        fontWeight: "bold",
        textTransform: "uppercase",
    },
    tableRow: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: "#E2E8F0",
        paddingVertical: 8,
        paddingHorizontal: 10,
    },
    tdText: {
        fontSize: 9,
        color: "#1E293B",
    },
    colDesc: { width: "50%" },
    colQty: { width: "15%", textAlign: "center" },
    colRate: { width: "15%", textAlign: "right" },
    colTotal: { width: "20%", textAlign: "right" },
    summarySection: {
        flexDirection: "row",
        justifyContent: "flex-end",
        marginBottom: 24,
    },
    summaryBox: {
        width: "45%",
    },
    summaryRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 4,
    },
    summaryLabel: {
        fontSize: 9,
        color: "#64748B",
    },
    summaryValue: {
        fontSize: 9,
        fontWeight: "bold",
        color: "#0B132B",
    },
    totalRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        borderTopWidth: 2,
        borderTopColor: "#0B132B",
        paddingTop: 8,
        marginTop: 4,
    },
    totalLabel: {
        fontSize: 12,
        fontWeight: "bold",
        color: "#0B132B",
    },
    totalValue: {
        fontSize: 13,
        fontWeight: "bold",
        color: "#D4AF37",
    },
    dueRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        backgroundColor: "#FEF3C7",
        padding: 6,
        borderRadius: 4,
        marginTop: 6,
    },
    dueLabel: {
        fontSize: 10,
        fontWeight: "bold",
        color: "#92400E",
    },
    dueValue: {
        fontSize: 10,
        fontWeight: "bold",
        color: "#92400E",
    },
    footer: {
        borderTopWidth: 1,
        borderTopColor: "#E2E8F0",
        paddingTop: 12,
        marginTop: "auto",
        alignItems: "center",
    },
    footerText: {
        fontSize: 8,
        color: "#94A3B8",
        textAlign: "center",
    }
});

interface InvoicePDFTemplateProps {
    invoice: {
        invoiceNumber: string;
        customerName: string;
        customerEmail?: string;
        customerPhone?: string;
        invoiceType: string;
        issueDate: string;
        dueDate: string;
        paymentTerms?: string;
        currency: string;
        subtotal: number;
        discount: number;
        logisticsCost: number;
        laborCost: number;
        additionalCharges: number;
        totalAmount: number;
        amountPaid: number;
        amountDue: number;
        status: string;
        notes?: string;
        items: Array<{
            id: string;
            description: string;
            units: number;
            days: number;
            unitPrice: number;
            lineTotal: number;
        }>;
    };
    companyDetails?: {
        name?: string;
        address?: string;
        crNumber?: string;
        iban?: string;
        bankName?: string;
        accountNumber?: string;
    };
}

export function InvoicePDFTemplate({ invoice, companyDetails }: InvoicePDFTemplateProps) {
    const isDev = process.env.NODE_ENV === "development";
    const company = companyDetails || {};
    const hasBankDetails = Boolean(company.bankName || company.iban || company.accountNumber);

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.brandTitle}>E3 RENTALS</Text>
                        <Text style={styles.brandSubtitle}>Premier Event Production & Fleet Rentals</Text>
                        {company.address ? <Text style={styles.brandSubtitle}>{company.address}</Text> : null}
                        {company.crNumber ? <Text style={styles.brandSubtitle}>CR: {company.crNumber}</Text> : null}
                    </View>
                    <View style={styles.invoiceMeta}>
                        <Text style={styles.invoiceTitle}>COMMERCIAL INVOICE</Text>
                        <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
                        <Text style={styles.dateText}>Issue Date: {new Date(invoice.issueDate).toLocaleDateString()}</Text>
                        <Text style={styles.dateText}>Due Date: {new Date(invoice.dueDate).toLocaleDateString()}</Text>
                        <Text style={styles.dateText}>Type: {invoice.invoiceType.toUpperCase()}</Text>
                    </View>
                </View>

                {/* Parties */}
                <View style={styles.partySection}>
                    <View style={styles.partyBox}>
                        <Text style={styles.partyLabel}>Billed To (Customer)</Text>
                        <Text style={styles.partyName}>{invoice.customerName}</Text>
                        {invoice.customerEmail && <Text style={styles.partyText}>Email: {invoice.customerEmail}</Text>}
                        {invoice.customerPhone && <Text style={styles.partyText}>Phone: {invoice.customerPhone}</Text>}
                        <Text style={styles.partyText}>Payment Terms: {invoice.paymentTerms || "Standard Commercial Terms"}</Text>
                    </View>
                    <View style={styles.partyBox}>
                        <Text style={styles.partyLabel}>Remittance & Bank Details</Text>
                        {hasBankDetails ? (
                            <>
                                {company.bankName && <Text style={styles.partyName}>{company.bankName}</Text>}
                                {company.name && <Text style={styles.partyText}>Account: {company.name}</Text>}
                                {company.accountNumber && <Text style={styles.partyText}>Account No: {company.accountNumber}</Text>}
                                {company.iban && <Text style={styles.partyText}>IBAN: {company.iban}</Text>}
                                <Text style={styles.partyText}>Ref: {invoice.invoiceNumber}</Text>
                            </>
                        ) : isDev ? (
                            <>
                                <Text style={styles.partyName}>E3 Operations (Development)</Text>
                                <Text style={styles.partyText}>[Sandbox Preview — Configure Bank in Settings]</Text>
                                <Text style={styles.partyText}>Ref: {invoice.invoiceNumber}</Text>
                            </>
                        ) : (
                            <>
                                <Text style={styles.partyName}>Official Bank Remittance</Text>
                                <Text style={styles.partyText}>Wire instructions available upon commercial request.</Text>
                                <Text style={styles.partyText}>Ref: {invoice.invoiceNumber}</Text>
                            </>
                        )}
                    </View>
                </View>

                {/* Items Table */}
                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.thText, styles.colDesc]}>Description</Text>
                        <Text style={[styles.thText, styles.colQty]}>Units</Text>
                        <Text style={[styles.thText, styles.colRate]}>Rate (QAR)</Text>
                        <Text style={[styles.thText, styles.colTotal]}>Total (QAR)</Text>
                    </View>
                    {invoice.items.map((item, idx) => (
                        <View key={item.id || idx} style={styles.tableRow}>
                            <Text style={[styles.tdText, styles.colDesc]}>{item.description}</Text>
                            <Text style={[styles.tdText, styles.colQty]}>{item.units}</Text>
                            <Text style={[styles.tdText, styles.colRate]}>{(item.unitPrice || 0).toLocaleString()}</Text>
                            <Text style={[styles.tdText, styles.colTotal]}>{(item.lineTotal || 0).toLocaleString()}</Text>
                        </View>
                    ))}
                </View>

                {/* Financial Summary */}
                <View style={styles.summarySection}>
                    <View style={styles.summaryBox}>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Equipment Subtotal:</Text>
                            <Text style={styles.summaryValue}>QAR {(invoice.subtotal || 0).toLocaleString()}</Text>
                        </View>
                        {invoice.logisticsCost > 0 && (
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Logistics & Transport:</Text>
                                <Text style={styles.summaryValue}>QAR {invoice.logisticsCost.toLocaleString()}</Text>
                            </View>
                        )}
                        {invoice.laborCost > 0 && (
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Technical Crew & Rigging:</Text>
                                <Text style={styles.summaryValue}>QAR {invoice.laborCost.toLocaleString()}</Text>
                            </View>
                        )}
                        {invoice.additionalCharges > 0 && (
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Custom Permits & Setup:</Text>
                                <Text style={styles.summaryValue}>QAR {invoice.additionalCharges.toLocaleString()}</Text>
                            </View>
                        )}
                        {invoice.discount > 0 && (
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Commercial Discount:</Text>
                                <Text style={styles.summaryValue}>-QAR {invoice.discount.toLocaleString()}</Text>
                            </View>
                        )}
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Invoice Total:</Text>
                            <Text style={styles.totalValue}>QAR {(invoice.totalAmount || 0).toLocaleString()}</Text>
                        </View>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Amount Paid / Cleared:</Text>
                            <Text style={styles.summaryValue}>QAR {(invoice.amountPaid || 0).toLocaleString()}</Text>
                        </View>
                        <View style={styles.dueRow}>
                            <Text style={styles.dueLabel}>Balance Outstanding:</Text>
                            <Text style={styles.dueValue}>QAR {(invoice.amountDue || 0).toLocaleString()}</Text>
                        </View>
                    </View>
                </View>

                {/* Footer Notes */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        {invoice.notes || "Thank you for partnering with E3 Rentals. All equipment is subject to master rental terms and conditions."}
                    </Text>
                    <Text style={[styles.footerText, { marginTop: 4 }]}>
                        Generated electronically by E3 Rentals Financial Core — Verification Ref #{invoice.invoiceNumber}
                    </Text>
                </View>
            </Page>
        </Document>
    );
}
