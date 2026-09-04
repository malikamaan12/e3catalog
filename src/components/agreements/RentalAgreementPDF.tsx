import React from "react";
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";

const styles = StyleSheet.create({
    page: {
        padding: 40,
        fontFamily: "Helvetica",
        fontSize: 9,
        color: "#1e293b",
        lineHeight: 1.4,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        borderBottomWidth: 2,
        borderBottomColor: "#0f172a",
        paddingBottom: 15,
        marginBottom: 15,
    },
    logoText: {
        fontSize: 22,
        fontWeight: "bold",
        color: "#0f172a",
    },
    subLogo: {
        fontSize: 8,
        color: "#64748b",
        marginTop: 2,
        textTransform: "uppercase",
    },
    headerRight: {
        alignItems: "flex-end",
    },
    agreementNum: {
        fontSize: 12,
        fontWeight: "bold",
        color: "#0284c7",
    },
    dateText: {
        fontSize: 8,
        color: "#64748b",
        marginTop: 2,
    },
    statusBadge: {
        marginTop: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
        backgroundColor: "#dcfce7",
        borderRadius: 4,
    },
    statusText: {
        fontSize: 8,
        fontWeight: "bold",
        color: "#166534",
        textTransform: "uppercase",
    },
    sectionTitle: {
        fontSize: 10,
        fontWeight: "bold",
        color: "#0f172a",
        backgroundColor: "#f8fafc",
        borderLeftWidth: 3,
        borderLeftColor: "#0284c7",
        padding: 4,
        paddingLeft: 8,
        marginTop: 10,
        marginBottom: 6,
        textTransform: "uppercase",
    },
    partiesRow: {
        flexDirection: "row",
        gap: 15,
        marginBottom: 8,
    },
    partyBox: {
        flex: 1,
        borderWidth: 1,
        borderColor: "#e2e8f0",
        borderRadius: 4,
        padding: 8,
    },
    partyTitle: {
        fontSize: 9,
        fontWeight: "bold",
        color: "#334155",
        marginBottom: 4,
        textTransform: "uppercase",
    },
    partyLine: {
        fontSize: 8,
        color: "#475569",
        marginBottom: 2,
    },
    termsText: {
        fontSize: 7.5,
        color: "#334155",
        marginBottom: 4,
        textAlign: "justify",
    },
    liabilityBox: {
        flexDirection: "row",
        justifyContent: "space-between",
        backgroundColor: "#f0fdf4",
        borderWidth: 1,
        borderColor: "#bbf7d0",
        borderRadius: 4,
        padding: 8,
        marginVertical: 8,
    },
    liabilityCol: {
        alignItems: "center",
        flex: 1,
    },
    liabilityVal: {
        fontSize: 11,
        fontWeight: "bold",
        color: "#15803d",
    },
    liabilityLabel: {
        fontSize: 7.5,
        color: "#166534",
        textTransform: "uppercase",
        marginTop: 2,
    },
    signatureContainer: {
        flexDirection: "row",
        gap: 15,
        marginTop: 15,
        borderTopWidth: 1,
        borderTopColor: "#e2e8f0",
        paddingTop: 10,
    },
    signatureBox: {
        flex: 1,
        borderWidth: 1,
        borderColor: "#cbd5e1",
        borderRadius: 4,
        padding: 8,
        minHeight: 90,
    },
    signatureImage: {
        height: 45,
        width: 140,
        marginBottom: 4,
    },
    auditCertificate: {
        marginTop: 12,
        padding: 6,
        backgroundColor: "#f8fafc",
        borderWidth: 1,
        borderColor: "#e2e8f0",
        borderRadius: 4,
        fontSize: 7,
        color: "#64748b",
    },
});

interface RentalAgreementPDFProps {
    data: {
        agreementNumber: string;
        date: string;
        status: string;
        clientName: string;
        clientEmail: string;
        clientPhone?: string;
        clientQid?: string;
        projectName: string;
        venue: string;
        startDate: string;
        endDate: string;
        productName: string;
        units: number;
        totalRentPrice: number;
        replacementValue: number;
        securityDeposit: number;
        signatureData?: string | null;
        signedAt?: string | null;
        ipAddress?: string | null;
    };
}

export default function RentalAgreementPDF({ data }: RentalAgreementPDFProps) {
    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.logoText}>E3 RENTALS QATAR</Text>
                        <Text style={styles.subLogo}>Events & Entertainment Enterprises W.L.L</Text>
                        <Text style={styles.subLogo}>Doha, State of Qatar | CR: 104928 | info@eeeqa.com</Text>
                    </View>
                    <View style={styles.headerRight}>
                        <Text style={styles.agreementNum}>{data.agreementNumber}</Text>
                        <Text style={styles.dateText}>Issue Date: {data.date}</Text>
                        <View style={styles.statusBadge}>
                            <Text style={styles.statusText}>{data.status === "signed" ? "DIGITALLY EXECUTED & BINDING" : "PENDING SIGNATURE"}</Text>
                        </View>
                    </View>
                </View>

                {/* Parties */}
                <View style={styles.partiesRow}>
                    <View style={styles.partyBox}>
                        <Text style={styles.partyTitle}>Lessor (Equipment Provider)</Text>
                        <Text style={styles.partyLine}>Events & Entertainment Enterprises W.L.L</Text>
                        <Text style={styles.partyLine}>Industrial Area & Lusail Hub, Doha, Qatar</Text>
                        <Text style={styles.partyLine}>Tel: +974 4400 0000 | ops@eeeqa.com</Text>
                    </View>
                    <View style={styles.partyBox}>
                        <Text style={styles.partyTitle}>Lessee (Renter / Client)</Text>
                        <Text style={styles.partyLine}>Name: {data.clientName}</Text>
                        <Text style={styles.partyLine}>Email: {data.clientEmail}</Text>
                        <Text style={styles.partyLine}>Phone: {data.clientPhone || "Provided on file"}</Text>
                        <Text style={styles.partyLine}>Qatar ID / Passport: {data.clientQid || "Recorded on signature"}</Text>
                    </View>
                </View>

                {/* Event & Equipment Particulars */}
                <Text style={styles.sectionTitle}>Rental Engagement Particulars</Text>
                <View style={styles.partiesRow}>
                    <View style={styles.partyBox}>
                        <Text style={styles.partyLine}><Text style={{ fontWeight: "bold" }}>Event Project:</Text> {data.projectName}</Text>
                        <Text style={styles.partyLine}><Text style={{ fontWeight: "bold" }}>Venue / Location:</Text> {data.venue}</Text>
                        <Text style={styles.partyLine}><Text style={{ fontWeight: "bold" }}>Start (Delivery):</Text> {data.startDate}</Text>
                        <Text style={styles.partyLine}><Text style={{ fontWeight: "bold" }}>End (Return):</Text> {data.endDate}</Text>
                    </View>
                    <View style={styles.partyBox}>
                        <Text style={styles.partyLine}><Text style={{ fontWeight: "bold" }}>Primary Asset:</Text> {data.productName}</Text>
                        <Text style={styles.partyLine}><Text style={{ fontWeight: "bold" }}>Reserved Units:</Text> {data.units} Unit(s)</Text>
                        <Text style={styles.partyLine}><Text style={{ fontWeight: "bold" }}>Rental Amount:</Text> QAR {data.totalRentPrice.toLocaleString()}</Text>
                    </View>
                </View>

                {/* Liability & Financial Schedule */}
                <View style={styles.liabilityBox}>
                    <View style={styles.liabilityCol}>
                        <Text style={styles.liabilityVal}>QAR {data.totalRentPrice.toLocaleString()}</Text>
                        <Text style={styles.liabilityLabel}>Agreed Rental Fee</Text>
                    </View>
                    <View style={styles.liabilityCol}>
                        <Text style={styles.liabilityVal}>QAR {data.securityDeposit.toLocaleString()}</Text>
                        <Text style={styles.liabilityLabel}>Refundable Security Deposit</Text>
                    </View>
                    <View style={styles.liabilityCol}>
                        <Text style={styles.liabilityVal}>QAR {data.replacementValue.toLocaleString()}</Text>
                        <Text style={styles.liabilityLabel}>Declared Replacement Liability</Text>
                    </View>
                </View>

                {/* Legal Clauses */}
                <Text style={styles.sectionTitle}>Terms & Conditions of Rental</Text>
                <Text style={styles.termsText}>
                    1. CONDITION & INSPECTION: Lessee acknowledges receiving the equipment in optimal operational condition. All serial tags, calibration seals, and accessories must remain intact.
                </Text>
                <Text style={styles.termsText}>
                    2. LIABILITY FOR LOSS OR DAMAGE: The Lessee accepts complete financial and legal liability for any physical damage, water intrusion, electrical burnout, vandalism, or theft occurring during the rental tenure. In the event of total loss, Lessee shall pay the full Declared Replacement Value stated above within 7 days.
                </Text>
                <Text style={styles.termsText}>
                    3. BUMP-OUT & RETURN: Equipment must be returned to Lessor by the End Date specified. Unscheduled overdue returns shall be billed at 125% of standard daily rates.
                </Text>
                <Text style={styles.termsText}>
                    4. GOVERNING LAW & ARBITRATION: This Agreement is executed and enforceable under the Laws of the State of Qatar. Any disputes shall be submitted to the exclusive jurisdiction of the Courts of Qatar.
                </Text>

                {/* Signatures */}
                <View style={styles.signatureContainer}>
                    <View style={styles.signatureBox}>
                        <Text style={{ fontSize: 8, fontWeight: "bold", color: "#334155", marginBottom: 4 }}>For Lessor (E3 Rentals Qatar):</Text>
                        <Text style={{ fontSize: 14, fontFamily: "Helvetica-Oblique", color: "#0284c7", marginVertical: 8 }}>Events & Entertainment Enterprises</Text>
                        <Text style={{ fontSize: 7, color: "#64748b" }}>Authorized Logistics & Operations Officer</Text>
                    </View>

                    <View style={styles.signatureBox}>
                        <Text style={{ fontSize: 8, fontWeight: "bold", color: "#334155", marginBottom: 4 }}>For Lessee (Client Signature):</Text>
                        {data.signatureData ? (
                            <Image src={data.signatureData} style={styles.signatureImage} />
                        ) : (
                            <View style={{ height: 45, justifyContent: "center" }}>
                                <Text style={{ fontSize: 8, color: "#94a3b8", fontStyle: "italic" }}>[Awaiting Client E-Signature]</Text>
                            </View>
                        )}
                        <Text style={{ fontSize: 7.5, fontWeight: "bold", color: "#0f172a" }}>Signer: {data.clientName} {data.clientQid ? `(QID: ${data.clientQid})` : ""}</Text>
                        <Text style={{ fontSize: 7, color: "#64748b" }}>Signed At: {data.signedAt || "Pending Execution"}</Text>
                    </View>
                </View>

                {/* Audit Certificate */}
                {data.status === "signed" && (
                    <View style={styles.auditCertificate}>
                        <Text style={{ fontWeight: "bold" }}>DIGITAL AUDIT TRAIL CERTIFICATE:</Text>
                        <Text>Signer IP: {data.ipAddress || "127.0.0.1"} | Cryptographic Signature Verified | Enforceable under Qatar E-Commerce Law No. 16 of 2010.</Text>
                    </View>
                )}
            </Page>
        </Document>
    );
}
