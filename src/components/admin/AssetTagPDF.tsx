"use client";

import React from "react";
import { 
    Document, 
    Page, 
    Text, 
    View, 
    StyleSheet, 
    Image
} from "@react-pdf/renderer";

// Label size configurations (in points: 1mm ≈ 2.835pt)
const LABEL_CONFIGS = {
    small: {
        label: "Small (50×25mm)",
        pageWidth: 142, // 50mm
        pageHeight: 71, // 25mm
        cols: 1,
        rows: 1,
        stickerW: 132,
        stickerH: 61,
        qrSize: 35,
        fontSize: { vendor: 5, product: 5, tag: 7 },
        padding: 5,
        perPage: 1,
    },
    medium: {
        label: "Medium (62×29mm)",
        pageWidth: 176,
        pageHeight: 82,
        cols: 1,
        rows: 1,
        stickerW: 166,
        stickerH: 72,
        qrSize: 44,
        fontSize: { vendor: 5, product: 6, tag: 8 },
        padding: 5,
        perPage: 1,
    },
    large: {
        label: "Large (100×50mm)",
        pageWidth: 284,
        pageHeight: 142,
        cols: 1,
        rows: 1,
        stickerW: 264,
        stickerH: 122,
        qrSize: 70,
        fontSize: { vendor: 7, product: 7, tag: 10 },
        padding: 10,
        perPage: 1,
    },
    a4_sheet: {
        label: "A4 Sheet (Grid)",
        pageWidth: 595, // A4 width
        pageHeight: 842, // A4 height
        cols: 3,
        rows: 6,
        stickerW: 170,
        stickerH: 120,
        qrSize: 55,
        fontSize: { vendor: 6, product: 7, tag: 10 },
        padding: 10,
        perPage: 18,
    },
};

export type LabelSize = keyof typeof LABEL_CONFIGS;
export const LABEL_SIZE_OPTIONS = Object.entries(LABEL_CONFIGS).map(([k, v]) => ({
    value: k as LabelSize,
    label: v.label,
}));

interface AssetTagPDFProps {
    items: Array<{
        assetTagCode: string;
        productName: string;
        vendorName: string;
        qrDataUri?: string;
    }>;
    labelSize?: LabelSize;
}

export const AssetTagPDF = ({ items, labelSize = "a4_sheet" }: AssetTagPDFProps) => {
    const config = LABEL_CONFIGS[labelSize];
    const isSheet = labelSize === "a4_sheet";

    // For sheet mode, chunk items into pages
    const pages: typeof items[] = [];
    if (isSheet) {
        for (let i = 0; i < items.length; i += config.perPage) {
            pages.push(items.slice(i, i + config.perPage));
        }
    } else {
        // Individual labels: 1 per page
        items.forEach(item => pages.push([item]));
    }

    const stickerStyle = StyleSheet.create({
        sticker: {
            width: config.stickerW,
            height: config.stickerH,
            border: "1pt solid #000",
            padding: config.padding,
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
            marginBottom: 3,
        },
        vendorName: { fontSize: config.fontSize.vendor, fontWeight: "bold" },
        brandMarker: { fontSize: config.fontSize.vendor - 1, color: "#666" },
        qrPlaceholder: {
            width: config.qrSize,
            height: config.qrSize,
            backgroundColor: "#eee",
        },
        footer: { width: "100%", textAlign: "center", marginTop: 3 },
        productName: { fontSize: config.fontSize.product, fontWeight: "bold", marginBottom: 1 },
        assetTag: { fontSize: config.fontSize.tag, fontFamily: "Courier-Bold", letterSpacing: 1.5 },
    });

    return (
        <Document>
            {pages.map((pageItems, pageIndex) => (
                <Page
                    key={pageIndex}
                    size={isSheet ? "A4" : { width: config.pageWidth, height: config.pageHeight }}
                    style={{
                        padding: isSheet ? 20 : 5,
                        backgroundColor: "#ffffff",
                    }}
                >
                    <View style={{
                        flexDirection: "row",
                        flexWrap: "wrap",
                        justifyContent: isSheet ? "flex-start" : "center",
                        alignItems: isSheet ? "flex-start" : "center",
                        gap: isSheet ? 8 : 0,
                        flex: 1,
                    }}>
                        {pageItems.map((item, index) => (
                            <View key={index} style={stickerStyle.sticker}>
                                <View style={stickerStyle.header}>
                                    <Text style={stickerStyle.vendorName}>{(item.vendorName || "E3 RENTALS").toUpperCase()}</Text>
                                    <Text style={stickerStyle.brandMarker}>E3</Text>
                                </View>
                                
                                {item.qrDataUri ? (
                                    <Image src={item.qrDataUri} style={{ width: config.qrSize, height: config.qrSize }} />
                                ) : (
                                    <View style={stickerStyle.qrPlaceholder} />
                                )}

                                <View style={stickerStyle.footer}>
                                    <Text style={stickerStyle.productName}>{(item.productName || "").substring(0, isSheet ? 20 : 30)}</Text>
                                    <Text style={stickerStyle.assetTag}>{item.assetTagCode}</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                </Page>
            ))}
        </Document>
    );
};
