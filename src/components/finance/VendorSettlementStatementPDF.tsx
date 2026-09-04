import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
    page: {
        padding: 35,
        fontFamily: "Helvetica",
        fontSize: 8.5,
        color: "#1e293b",
        lineHeight: 1.35,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        borderBottomWidth: 2,
        borderBottomColor: "#0f172a",
        paddingBottom: 12,
        marginBottom: 12,
    },
    logoText: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#0f172a",
    },
    subLogo: {
        fontSize: 7.5,
        color: "#64748b",
        marginTop: 1.5,
        textTransform: "uppercase",
    },
    headerRight: {
        alignItems: "flex-end",
    },
    statementNum: {
        fontSize: 11,
        fontWeight: "bold",
        color: "#0284c7",
    },
    dateText: {
        fontSize: 7.5,
        color: "#64748b",
        marginTop: 2,
    },
    statusBadge: {
        marginTop: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        alignSelf: "flex-end",
    },
    statusPaid: {
        backgroundColor: "#dcfce7",
    },
    statusPending: {
        backgroundColor: "#fef3c7",
    },
    statusText: {
        fontSize: 7.5,
        fontWeight: "bold",
        textTransform: "uppercase",
    },
    partiesRow: {
        flexDirection: "row",
        gap: 12,
        marginBottom: 10,
    },
    partyBox: {
        flex: 1,
        borderWidth: 1,
        borderColor: "#e2e8f0",
        borderRadius: 4,
        padding: 8,
    },
    partyTitle: {
        fontSize: 8.5,
        fontWeight: "bold",
        color: "#334155",
        marginBottom: 3,
        textTransform: "uppercase",
    },
    partyLine: {
        fontSize: 7.5,
        color: "#475569",
        marginBottom: 1.5,
    },
    summaryBox: {
        flexDirection: "row",
        justifyContent: "space-between",
        backgroundColor: "#f8fafc",
        borderWidth: 1,
        borderColor: "#cbd5e1",
        borderRadius: 4,
        padding: 10,
        marginBottom: 12,
    },
    summaryCol: {
        alignItems: "center",
        flex: 1,
    },
    summaryVal: {
        fontSize: 11,
        fontWeight: "bold",
        color: "#0f172a",
    },
    summaryLabel: {
        fontSize: 7,
        color: "#64748b",
        textTransform: "uppercase",
        marginTop: 2,
    },
    netVal: {
        fontSize: 12,
        fontWeight: "bold",
        color: "#16a34a",
    },
    sectionTitle: {
        fontSize: 9,
        fontWeight: "bold",
        color: "#0f172a",
        backgroundColor: "#f1f5f9",
        padding: 4,
        paddingLeft: 6,
        marginBottom: 6,
        textTransform: "uppercase",
    },
    tableHeader: {
        flexDirection: "row",
        backgroundColor: "#0f172a",
        color: "#ffffff",
        padding: 5,
        fontWeight: "bold",
        fontSize: 7.5,
        textTransform: "uppercase",
    },
    tableRow: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: "#f1f5f9",
        padding: 4.5,
        fontSize: 7.5,
    },
    colRef: { width: "20%" },
    colProject: { width: "30%" },
    colGross: { width: "16%", textAlign: "right" },
    colComm: { width: "16%", textAlign: "right" },
    colNet: { width: "18%", textAlign: "right", fontWeight: "bold" },

    wireBox: {
        marginTop: 12,
        borderWidth: 1,
        borderColor: "#bbf7d0",
        backgroundColor: "#f0fdf4",
        borderRadius: 4,
        padding: 8,
    },
    wireTitle: {
        fontSize: 8,
        fontWeight: "bold",
        color: "#166534",
        textTransform: "uppercase",
        marginBottom: 3,
    },
    wireLine: {
        fontSize: 7.5,
        color: "#15803d",
        marginBottom: 1.5,
    },
    footer: {
        marginTop: 15,
        borderTopWidth: 1,
        borderTopColor: "#e2e8f0",
        paddingTop: 8,
        flexDirection: "row",
        justifyContent: "space-between",
        fontSize: 7,
        color: "#94a3b8",
    },
});

interface VendorSettlementPDFProps {
    data: {
        statementNumber: string;
        date: string;
        periodStart: string;
        periodEnd: string;
        status: string;
        vendorName: string;
        vendorEmail: string;
        vendorPhone?: string;
        vendorCr?: string;
        bankName?: string;
        bankIban?: string;
        transactionReference?: string;
        paidAt?: string | null;
        totalBookingsCount: number;
        grossRevenue: number;
        commissionTotal: number;
        netPayable: number;
        items: Array<{
            bookingId: string;
            projectName: string;
            dates: string;
            grossAmount: number;
            commissionRate: number;
            commissionAmount: number;
            vendorEarnings: number;
        }>;
    };
}

export default function VendorSettlementStatementPDF({ data }: VendorSettlementPDFProps) {
    const isPaid = data.status === "paid";

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.logoText}>E3 RENTALS QATAR</Text>
                        <Text style={styles.subLogo}>Events & Entertainment Enterprises W.L.L</Text>
                        <Text style={styles.subLogo}>Vendor Self-Billing Settlement & Remittance Statement</Text>
                    </View>
                    <View style={styles.headerRight}>
                        <Text style={styles.statementNum}>{data.statementNumber}</Text>
                        <Text style={styles.dateText}>Issue Date: {data.date}</Text>
                        <Text style={styles.dateText}>Cycle: {data.periodStart} - {data.periodEnd}</Text>
                        <View style={[styles.statusBadge, isPaid ? styles.statusPaid : styles.statusPending]}>
                            <Text style={[styles.statusText, { color: isPaid ? "#166534" : "#854d0e" }]}>
                                {isPaid ? "SETTLED & PAID" : "APPROVED / PENDING WIRE"}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Parties */}
                <View style={styles.partiesRow}>
                    <View style={styles.partyBox}>
                        <Text style={styles.partyTitle}>Issuer (Platform Operator)</Text>
                        <Text style={styles.partyLine}>Events & Entertainment Enterprises W.L.L</Text>
                        <Text style={styles.partyLine}>CR: 104928 | Doha, State of Qatar</Text>
                        <Text style={styles.partyLine}>Email: accounts@eeeqa.com</Text>
                    </View>
                    <View style={styles.partyBox}>
                        <Text style={styles.partyTitle}>Vendor Beneficiary (Equipment Partner)</Text>
                        <Text style={styles.partyLine}>Company: {data.vendorName}</Text>
                        <Text style={styles.partyLine}>CR / Tax ID: {data.vendorCr || "On File"}</Text>
                        <Text style={styles.partyLine}>Email: {data.vendorEmail}</Text>
                        <Text style={styles.partyLine}>IBAN: {data.bankIban || "Registered Wire Account"}</Text>
                    </View>
                </View>

                {/* Financial Summary */}
                <View style={styles.summaryBox}>
                    <View style={styles.summaryCol}>
                        <Text style={styles.summaryVal}>{data.totalBookingsCount}</Text>
                        <Text style={styles.summaryLabel}>Bookings Settled</Text>
                    </View>
                    <View style={styles.summaryCol}>
                        <Text style={styles.summaryVal}>QAR {data.grossRevenue.toLocaleString()}</Text>
                        <Text style={styles.summaryLabel}>Gross Rental Revenue</Text>
                    </View>
                    <View style={styles.summaryCol}>
                        <Text style={[styles.summaryVal, { color: "#dc2626" }]}>- QAR {data.commissionTotal.toLocaleString()}</Text>
                        <Text style={styles.summaryLabel}>Platform Commission</Text>
                    </View>
                    <View style={styles.summaryCol}>
                        <Text style={styles.netVal}>QAR {data.netPayable.toLocaleString()}</Text>
                        <Text style={[styles.summaryLabel, { color: "#166534", fontWeight: "bold" }]}>Net Payout to Vendor</Text>
                    </View>
                </View>

                {/* Itemized Bookings Breakdown */}
                <Text style={styles.sectionTitle}>Itemized Booking & Commission Schedule</Text>
                
                <View style={styles.tableHeader}>
                    <Text style={styles.colRef}>Booking Ref</Text>
                    <Text style={styles.colProject}>Project / Event</Text>
                    <Text style={styles.colGross}>Gross (QAR)</Text>
                    <Text style={styles.colComm}>Comm (QAR)</Text>
                    <Text style={styles.colNet}>Net Share (QAR)</Text>
                </View>

                {data.items.map((item, idx) => (
                    <View key={idx} style={[styles.tableRow, { backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f8fafc" }]}>
                        <Text style={styles.colRef}>#{item.bookingId.slice(0, 8).toUpperCase()}</Text>
                        <Text style={styles.colProject}>{item.projectName}</Text>
                        <Text style={styles.colGross}>{item.grossAmount.toLocaleString()}</Text>
                        <Text style={styles.colComm}>{item.commissionAmount.toLocaleString()} ({item.commissionRate}%)</Text>
                        <Text style={styles.colNet}>{item.vendorEarnings.toLocaleString()}</Text>
                    </View>
                ))}

                {/* Wire Settlement Details */}
                <View style={styles.wireBox}>
                    <Text style={styles.wireTitle}>Banking & Payment Verification Voucher</Text>
                    <Text style={styles.wireLine}>Bank: {data.bankName || "Qatar National Bank (QNB)"} | IBAN: {data.bankIban || "QA..."}</Text>
                    <Text style={styles.wireLine}>
                        Wire Transfer Ref: {data.transactionReference || "Pending Bank Wire Release"} {data.paidAt ? `| Settled On: ${data.paidAt}` : ""}
                    </Text>
                    <Text style={{ fontSize: 7, color: "#15803d", marginTop: 2 }}>
                        This document serves as an official B2B self-billing credit statement under the Commercial Laws of Qatar.
                    </Text>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text>Prepared by E3 Finance & Settlements Engine · Doha, Qatar</Text>
                    <Text>Page 1 of 1</Text>
                </View>
            </Page>
        </Document>
    );
}
