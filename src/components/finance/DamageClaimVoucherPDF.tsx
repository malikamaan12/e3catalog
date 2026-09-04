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
        fontSize: 18,
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
    claimNum: {
        fontSize: 11,
        fontWeight: "bold",
        color: "#dc2626",
    },
    dateText: {
        fontSize: 7.5,
        color: "#64748b",
        marginTop: 2,
    },
    severityBadge: {
        marginTop: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        backgroundColor: "#fee2e2",
        alignSelf: "flex-end",
    },
    severityText: {
        fontSize: 7.5,
        fontWeight: "bold",
        color: "#b91c1c",
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
        fontSize: 8,
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
    sectionTitle: {
        fontSize: 8.5,
        fontWeight: "bold",
        color: "#0f172a",
        backgroundColor: "#f1f5f9",
        padding: 4,
        paddingLeft: 6,
        marginBottom: 6,
        marginTop: 6,
        textTransform: "uppercase",
    },
    incidentBox: {
        borderWidth: 1,
        borderColor: "#fecaca",
        backgroundColor: "#fef2f2",
        borderRadius: 4,
        padding: 8,
        marginBottom: 10,
    },
    incidentText: {
        fontSize: 8,
        color: "#991b1b",
        lineHeight: 1.4,
    },
    summaryBox: {
        flexDirection: "row",
        justifyContent: "space-between",
        backgroundColor: "#f8fafc",
        borderWidth: 1,
        borderColor: "#cbd5e1",
        borderRadius: 4,
        padding: 10,
        marginBottom: 10,
    },
    summaryCol: {
        alignItems: "center",
        flex: 1,
    },
    summaryVal: {
        fontSize: 10.5,
        fontWeight: "bold",
        color: "#0f172a",
    },
    summaryLabel: {
        fontSize: 7,
        color: "#64748b",
        textTransform: "uppercase",
        marginTop: 2,
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
    colDesc: { width: "70%" },
    colAmount: { width: "30%", textAlign: "right", fontWeight: "bold" },
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

interface DamageClaimPDFProps {
    data: {
        claimNumber: string;
        date: string;
        severity: string;
        status: string;
        clientName: string;
        clientEmail: string;
        clientPhone?: string;
        bookingRef: string;
        projectName: string;
        assetTagCode: string;
        productName: string;
        incidentDescription: string;
        partsCost: number;
        laborCost: number;
        totalClaimAmount: number;
        securityDepositHeld: number;
        amountDeducted: number;
        amountRefunded: number;
        filedByName: string;
    };
}

export default function DamageClaimVoucherPDF({ data }: DamageClaimPDFProps) {
    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.logoText}>E3 RENTALS QATAR</Text>
                        <Text style={styles.subLogo}>Events & Entertainment Enterprises W.L.L</Text>
                        <Text style={styles.subLogo}>Equipment Damage Assessment & Security Deposit Retention Notice</Text>
                    </View>
                    <View style={styles.headerRight}>
                        <Text style={styles.claimNum}>{data.claimNumber}</Text>
                        <Text style={styles.dateText}>Assessment Date: {data.date}</Text>
                        <Text style={styles.dateText}>Booking: #{data.bookingRef.slice(0, 8).toUpperCase()}</Text>
                        <View style={styles.severityBadge}>
                            <Text style={styles.severityText}>SEVERITY: {data.severity}</Text>
                        </View>
                    </View>
                </View>

                {/* Parties */}
                <View style={styles.partiesRow}>
                    <View style={styles.partyBox}>
                        <Text style={styles.partyTitle}>Rental Operator</Text>
                        <Text style={styles.partyLine}>Events & Entertainment Enterprises W.L.L</Text>
                        <Text style={styles.partyLine}>CR: 104928 | Technical Operations Dept.</Text>
                        <Text style={styles.partyLine}>Assessor: {data.filedByName}</Text>
                    </View>
                    <View style={styles.partyBox}>
                        <Text style={styles.partyTitle}>Responsible Renter (Client)</Text>
                        <Text style={styles.partyLine}>{data.clientName}</Text>
                        <Text style={styles.partyLine}>Email: {data.clientEmail}</Text>
                        <Text style={styles.partyLine}>Project: {data.projectName}</Text>
                    </View>
                </View>

                {/* Equipment Profile */}
                <Text style={styles.sectionTitle}>Damaged Asset Identification</Text>
                <View style={{ marginBottom: 6, padding: 6, backgroundColor: "#f8fafc", borderRadius: 4, borderWidth: 1, borderColor: "#e2e8f0" }}>
                    <Text style={{ fontSize: 8, fontWeight: "bold", color: "#0f172a" }}>
                        {data.productName} · Asset Tag: {data.assetTagCode}
                    </Text>
                </View>

                {/* Incident Description */}
                <Text style={styles.sectionTitle}>Incident Assessment & Return Audit</Text>
                <View style={styles.incidentBox}>
                    <Text style={styles.incidentText}>{data.incidentDescription}</Text>
                </View>

                {/* Cost Breakdown */}
                <Text style={styles.sectionTitle}>Restitution & Repair Cost Schedule</Text>
                <View style={styles.tableHeader}>
                    <Text style={styles.colDesc}>Remediation Component</Text>
                    <Text style={styles.colAmount}>Charge (QAR)</Text>
                </View>
                <View style={styles.tableRow}>
                    <Text style={styles.colDesc}>Replacement Spare Parts & Physical Hardware</Text>
                    <Text style={styles.colAmount}>QAR {data.partsCost.toLocaleString()}</Text>
                </View>
                <View style={styles.tableRow}>
                    <Text style={styles.colDesc}>Certified Technical Bench Labor & Recalibration</Text>
                    <Text style={styles.colAmount}>QAR {data.laborCost.toLocaleString()}</Text>
                </View>
                <View style={[styles.tableRow, { backgroundColor: "#f8fafc" }]}>
                    <Text style={[styles.colDesc, { fontWeight: "bold" }]}>Total Assessed Damage Restitution</Text>
                    <Text style={[styles.colAmount, { color: "#dc2626" }]}>QAR {data.totalClaimAmount.toLocaleString()}</Text>
                </View>

                {/* Deposit Settlement Summary */}
                <Text style={styles.sectionTitle}>Security Deposit Retention & Settlement</Text>
                <View style={styles.summaryBox}>
                    <View style={styles.summaryCol}>
                        <Text style={styles.summaryVal}>QAR {data.securityDepositHeld.toLocaleString()}</Text>
                        <Text style={styles.summaryLabel}>Security Deposit Held</Text>
                    </View>
                    <View style={styles.summaryCol}>
                        <Text style={[styles.summaryVal, { color: "#dc2626" }]}>- QAR {data.amountDeducted.toLocaleString()}</Text>
                        <Text style={styles.summaryLabel}>Amount Retained / Deducted</Text>
                    </View>
                    <View style={styles.summaryCol}>
                        <Text style={[styles.summaryVal, { color: "#16a34a" }]}>QAR {data.amountRefunded.toLocaleString()}</Text>
                        <Text style={[styles.summaryLabel, { color: "#16a34a", fontWeight: "bold" }]}>Refund Balance to Client</Text>
                    </View>
                </View>

                <Text style={{ fontSize: 7, color: "#64748b", marginTop: 4 }}>
                    Notice: Deductions are executed pursuant to the executed E3 Master Rental Agreement and Qatar Commercial Law. Uncontested refund balances are released within 3-5 business days via original payment instrument.
                </Text>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text>Official Document · E3 Logistics & Operations Fleet Control</Text>
                    <Text>Page 1 of 1</Text>
                </View>
            </Page>
        </Document>
    );
}
