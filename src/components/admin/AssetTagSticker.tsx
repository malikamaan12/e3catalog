"use client";

import React from "react";
import { QRCodeSVG } from "qrcode.react";

interface AssetTagStickerProps {
    assetTagCode: string;
    productName: string;
    vendorName: string;
    size?: "sm" | "md" | "lg";
    showBrand?: boolean;
}

export function AssetTagSticker({ 
    assetTagCode, 
    productName, 
    vendorName,
    size = "md",
    showBrand = true
}: AssetTagStickerProps) {
    // Determine dimensions based on size prop
    const dimensions = {
        sm: "w-32 h-20 p-2",
        md: "w-48 h-32 p-4",
        lg: "w-64 h-40 p-6"
    }[size];

    const qrSize = {
        sm: 60,
        md: 80,
        lg: 120
    }[size];

    // Truncate product name for clean layout
    const truncatedName = productName.length > 25 
        ? productName.substring(0, 22) + "..." 
        : productName;

    // The URL that will be encoded in the QR code
    const passportUrl = typeof window !== 'undefined' 
        ? `${window.location.origin}/passport/${assetTagCode}`
        : `https://e3rentals.com/passport/${assetTagCode}`;

    return (
        <div className={`${dimensions} bg-white border-2 border-black flex flex-col justify-between items-center shadow-sm print:shadow-none print:border-black`}>
            {/* Header: Vendor Name / Brand */}
            {showBrand && (
                <div className="w-full flex justify-between items-center border-b border-black pb-1 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-tighter text-black truncate max-w-[70%]">
                        {vendorName}
                    </span>
                    <span className="text-[8px] font-bold text-black opacity-50">E3 RENTALS</span>
                </div>
            )}

            {/* QR Code Section */}
            <div className="flex-1 flex items-center justify-center py-1">
                <QRCodeSVG 
                    value={passportUrl} 
                    size={qrSize}
                    level="H" // High error correction for slightly damaged stickers
                    includeMargin={false}
                    imageSettings={undefined}
                />
            </div>

            {/* Footer: Asset Info */}
            <div className="w-full text-center mt-1 space-y-0.5">
                <p className="text-[9px] font-bold text-black truncate uppercase leading-none">
                    {truncatedName}
                </p>
                <p className="text-[12px] font-mono font-black text-black tracking-widest leading-none">
                    {assetTagCode}
                </p>
            </div>

            {/* Print Crop Marks Hint (Optional) */}
            <div className="absolute top-0 left-0 w-1 h-1 border-t border-l border-black/20" />
            <div className="absolute top-0 right-0 w-1 h-1 border-t border-r border-black/20" />
            <div className="absolute bottom-0 left-0 w-1 h-1 border-b border-l border-black/20" />
            <div className="absolute bottom-0 right-0 w-1 h-1 border-b border-r border-black/20" />
        </div>
    );
}
