"use client";

import React from "react";
import { 
    Document, 
    Page, 
    Text, 
    View, 
    StyleSheet, 
    Image,
    Font
} from "@react-pdf/renderer";

// Styles for the PDF
const styles = StyleSheet.create({
    page: {
        padding: 20,
        backgroundColor: "#ffffff",
    },
    grid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "flex-start",
        gap: 10,
    },
    sticker: {
        width: "30%", // 3 stickers per row
        height: 120,
        border: "1pt solid #000",
        padding: 10,
        marginBottom: 10,
        flexDirection: "column",
        justifyContent: "space-between",
        alignItems: "center",
    },
    header: {
        width: "100%",
        flexDirection: "row",
        justifyContent: "space-between",
        borderBottom: "0.5pt solid #000",
        paddingBottom: 2,
        marginBottom: 5,
    },
    vendorName: {
        fontSize: 6,
        fontWeight: "bold",
    },
    brandMarker: {
        fontSize: 5,
        color: "#666",
    },
    qrPlaceholder: {
        width: 60,
        height: 60,
        backgroundColor: "#eee", // In a real app, we'd pass a data URI for the QR
    },
    footer: {
        width: "100%",
        textAlign: "center",
        marginTop: 5,
    },
    productName: {
        fontSize: 7,
        fontWeight: "bold",
        marginBottom: 2,
    },
    assetTag: {
        fontSize: 10,
        fontFamily: "Courier-Bold",
        letterSpacing: 2,
    }
});

interface AssetTagPDFProps {
    items: Array<{
        assetTagCode: string;
        productName: string;
        vendorName: string;
        qrDataUri?: string; // We'll pre-generate QR as Data URI for PDF
    }>;
}

export const AssetTagPDF = ({ items }: AssetTagPDFProps) => (
    <Document>
        <Page size="A4" style={styles.page}>
            <View style={styles.grid}>
                {items.map((item, index) => (
                    <View key={index} style={styles.sticker}>
                        <View style={styles.header}>
                            <Text style={styles.vendorName}>{item.vendorName.toUpperCase()}</Text>
                            <Text style={styles.brandMarker}>E3 RENTALS</Text>
                        </View>
                        
                        {item.qrDataUri ? (
                            <Image src={item.qrDataUri} style={{ width: 60, height: 60 }} />
                        ) : (
                            <View style={styles.qrPlaceholder} />
                        )}

                        <View style={styles.footer}>
                            <Text style={styles.productName}>{item.productName.substring(0, 20)}</Text>
                            <Text style={styles.assetTag}>{item.assetTagCode}</Text>
                        </View>
                    </View>
                ))}
            </View>
        </Page>
    </Document>
);
