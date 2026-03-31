import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

// Create styles
const styles = StyleSheet.create({
    page: {
        padding: 40,
        fontFamily: "Helvetica",
        fontSize: 10,
        color: "#1e293b",
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        borderBottomWidth: 2,
        borderBottomColor: "#0f172a",
        paddingBottom: 15,
        marginBottom: 20,
    },
    logoText: {
        fontSize: 28,
        fontWeight: "black", // @react-pdf/renderer interprets this as standard bold if custom fonts aren't loaded, or bold Helvetica
        color: "#0f172a",
        fontStyle: "italic",
    },
    title: {
        fontSize: 12,
        color: "#64748b",
        textTransform: "uppercase",
        marginTop: 5,
        fontWeight: "bold",
    },
    section: {
        marginBottom: 15,
    },
    sectionTitle: {
        fontSize: 11,
        color: "#0f172a",
        backgroundColor: "#f1f5f9",
        padding: 6,
        marginBottom: 8,
        textTransform: "uppercase",
    },
    row: {
        flexDirection: "row",
        marginBottom: 4,
    },
    label: {
        width: 120,
        color: "#475569",
    },
    value: {
        flex: 1,
        color: "#0f172a",
    },

    // Matrix Table
    table: {
        width: "auto",
        borderStyle: "solid",
        borderWidth: 1,
        borderColor: "#cbd5e1",
        borderRightWidth: 0,
        borderBottomWidth: 0,
        marginTop: 10,
        marginBottom: 20,
    },
    tableRow: {
        margin: "auto",
        flexDirection: "row",
    },
    tableColTag: {
        width: "25%",
        borderStyle: "solid",
        borderWidth: 1,
        borderColor: "#cbd5e1",
        borderLeftWidth: 0,
        borderTopWidth: 0,
        padding: 6,
    },
    tableColDesc: {
        width: "45%",
        borderStyle: "solid",
        borderWidth: 1,
        borderColor: "#cbd5e1",
        borderLeftWidth: 0,
        borderTopWidth: 0,
        padding: 6,
    },
    tableColSerial: {
        width: "15%",
        borderStyle: "solid",
        borderWidth: 1,
        borderColor: "#cbd5e1",
        borderLeftWidth: 0,
        borderTopWidth: 0,
        padding: 6,
    },
    tableColCond: {
        width: "15%",
        borderStyle: "solid",
        borderWidth: 1,
        borderColor: "#cbd5e1",
        borderLeftWidth: 0,
        borderTopWidth: 0,
        padding: 6,
    },
    tableCellHeader: {
        margin: "auto",
        fontSize: 9,
        fontWeight: "bold",
        color: "#475569",
        textTransform: "uppercase",
    },
    tableCell: {
        margin: "auto",
        fontSize: 9,
        color: "#0f172a",
    },
    tableCellTag: {
        margin: "auto",
        fontSize: 9,
        color: "#0f172a",
        fontFamily: "Courier",
    },

    // HSE Warning
    hseBox: {
        padding: 10,
        backgroundColor: "#fffbeb",
        borderWidth: 1,
        borderColor: "#fcd34d",
        marginBottom: 20,
    },
    hseWarningTitle: {
        fontSize: 9,
        fontWeight: "bold",
        color: "#b45309",
        marginBottom: 4,
        textTransform: "uppercase",
    },
    hseText: {
        fontSize: 8,
        color: "#92400e",
        lineHeight: 1.4,
    },

    // Signatures
    signaturesRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 40,
    },
    signBlock: {
        width: "30%",
        textAlign: "center",
    },
    signLine: {
        borderBottomWidth: 1,
        borderBottomColor: "#94a3b8",
        height: 40,
        marginBottom: 6,
    },
    signTitle: {
        fontSize: 9,
        fontWeight: "bold",
        color: "#334155",
        textTransform: "uppercase",
    },
    signDesc: {
        fontSize: 7,
        color: "#94a3b8",
        marginTop: 2,
    },
    footerLabel: {
        position: 'absolute',
        bottom: 25,
        left: 40,
        right: 40,
        textAlign: 'center',
        color: '#94a3b8',
        fontSize: 8,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
        paddingTop: 10
    }
});

type PdfProps = {
    data: {
        bookingId: string;
        clientName: string;
        venue: string;
        deliveryDate: string;
        timeWindow: string;
        dispatchLog: {
            driverName: string;
            vehiclePlate: string;
            company: string;
            dispatchTime: string;
            grossWeight: string;
        } | null;
        items: Array<{
            name: string;
            tag: string;
            serial: string;
            condition: string;
        }>;
    };
};

export default function TransportManifestPDF({ data }: PdfProps) {
    return (
        <Document title={`Manifest-${data.bookingId}`}>
            <Page size="A4" style={styles.page}>
                
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.logoText}>E3 RENTALS</Text>
                        <Text style={styles.title}>Transport Manifest & Delivery Report</Text>
                    </View>
                    <View style={{ alignItems: "flex-end", justifyContent: "flex-end" }}>
                        <Text style={{ fontSize: 9, color: "#64748b" }}>Ref: {data.bookingId.slice(0, 12).toUpperCase()}</Text>
                        <Text style={{ fontSize: 9, color: "#64748b" }}>Date: {new Date().toLocaleDateString()}</Text>
                    </View>
                </View>

                {/* Section 1: Project & Routing Details */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>1. Project & Routing Details</Text>
                    <View style={styles.row}>
                        <Text style={styles.label}>Client Name:</Text>
                        <Text style={styles.value}>{data.clientName}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Event Venue:</Text>
                        <Text style={styles.value}>{data.venue}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Delivery Window:</Text>
                        <Text style={styles.value}>{data.deliveryDate} | {data.timeWindow}</Text>
                    </View>
                </View>

                {/* Section 2: Transport & HSE Data */}
                {data.dispatchLog && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>2. Transport & HSE Data</Text>
                        <View style={styles.row}>
                            <Text style={styles.label}>Driver Name:</Text>
                            <Text style={styles.value}>{data.dispatchLog.driverName} ({data.dispatchLog.company})</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>Vehicle Plate:</Text>
                            <Text style={styles.value}>{data.dispatchLog.vehiclePlate}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>Dispatch Time:</Text>
                            <Text style={styles.value}>{data.dispatchLog.dispatchTime}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>Est. Gross Weight:</Text>
                            <Text style={styles.value}>{data.dispatchLog.grossWeight}</Text>
                        </View>
                    </View>
                )}

                {/* HSE Warning Block */}
                <View style={styles.hseBox}>
                    <Text style={styles.hseWarningTitle}>HSE & Compliance Warning</Text>
                    <Text style={styles.hseText}>
                        The total gross weight listed above is generated from the aggregate item data. The Transport Driver holds primary liability for the safe and legal distribution of this load over the vehicle's axles. All items must be securely strapped in accordance with regional road safety transport regulations prior to departing the E3 Depot. 
                    </Text>
                </View>

                {/* Section 3: The Payload Matrix */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>3. The Scanned Payload Matrix ({data.items.length} Units)</Text>
                    <View style={styles.table}>
                        {/* Table Header */}
                        <View style={[styles.tableRow, { backgroundColor: "#f8fafc" }]}>
                            <View style={styles.tableColTag}><Text style={styles.tableCellHeader}>Asset Tag</Text></View>
                            <View style={styles.tableColDesc}><Text style={styles.tableCellHeader}>Product Name</Text></View>
                            <View style={styles.tableColSerial}><Text style={styles.tableCellHeader}>S/N</Text></View>
                            <View style={styles.tableColCond}><Text style={styles.tableCellHeader}>Condition</Text></View>
                        </View>
                        {/* Table Rows */}
                        {data.items.map((item, i) => (
                            <View style={styles.tableRow} key={i}>
                                <View style={styles.tableColTag}><Text style={styles.tableCellTag}>{item.tag}</Text></View>
                                <View style={styles.tableColDesc}><Text style={styles.tableCell}>{item.name}</Text></View>
                                <View style={styles.tableColSerial}><Text style={styles.tableCell}>{item.serial}</Text></View>
                                <View style={styles.tableColCond}><Text style={styles.tableCell}>{item.condition}</Text></View>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Section 4: Tri-Party Sign-Off */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>4. Tri-Party Handover & Sign-Off</Text>
                    <View style={styles.signaturesRow}>
                        <View style={styles.signBlock}>
                            <View style={styles.signLine}></View>
                            <Text style={styles.signTitle}>Dispatched By</Text>
                            <Text style={styles.signDesc}>Warehouse Manager</Text>
                        </View>
                        <View style={styles.signBlock}>
                            <View style={styles.signLine}></View>
                            <Text style={styles.signTitle}>Carried By</Text>
                            <Text style={styles.signDesc}>Logistics Driver</Text>
                        </View>
                        <View style={styles.signBlock}>
                            <View style={styles.signLine}></View>
                            <Text style={styles.signTitle}>Received By</Text>
                            <Text style={styles.signDesc}>Client / Site Manager</Text>
                        </View>
                    </View>
                </View>

                {/* Footer */}
                <Text style={styles.footerLabel} render={({ pageNumber, totalPages }) => (
                    `Generated by E3 Rentals Logistics ERP • Page ${pageNumber} of ${totalPages} • Legally binding physical handover document.`
                )} fixed />
            </Page>
        </Document>
    );
}
