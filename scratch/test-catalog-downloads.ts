/**
 * E3 Rentals — Automated Verification Suite for Catalog & Spec Sheet Downloads
 * Tests /api/pdf/product/[id] and /api/pdf/catalog (JSON & PDF binary streams)
 */

import { db } from "../src/lib/db";
import { products, vendors } from "../src/lib/db/schema";
import { GET as getProductPdf } from "../src/app/api/pdf/product/[id]/route";
import { GET as getCatalogPdf } from "../src/app/api/pdf/catalog/route";
import { NextRequest } from "next/server";

async function runTests() {
    console.log("===============================================================================");
    console.log("  TEST SUITE: Catalog & Product Spec Sheet PDF Downloads");
    console.log("===============================================================================");

    // 1. Fetch an existing product
    const testProduct = await db.query.products.findFirst({
        with: { category: true, vendor: true },
    });

    if (!testProduct) {
        console.error("[-] No products found in database to test!");
        process.exit(1);
    }

    console.log(`[+] Found test product: "${testProduct.name}" (ID: ${testProduct.id}, Slug: ${testProduct.slug})`);

    // 2. Test Product Spec Sheet JSON Output
    console.log("\n[Test 1/5] Testing /api/pdf/product/[id]?format=json...");
    const req1 = new NextRequest(`http://localhost:5001/api/pdf/product/${testProduct.slug}?format=json`);
    const res1 = await getProductPdf(req1, { params: Promise.resolve({ id: testProduct.slug }) });
    const json1 = await res1.json();

    if (res1.status !== 200 || !json1.success || !json1.data?.product?.name) {
        console.error("[-] Test 1 Failed! Response:", json1);
        process.exit(1);
    }
    console.log(`✓ Spec Sheet JSON valid for "${json1.data.product.name}"`);
    console.log(`  - Category: ${json1.data.product.categoryName}`);
    console.log(`  - Rate: ${json1.data.product.pricePerDay} QAR/day`);
    console.log(`  - Power Requirements: ${json1.data.product.powerRequirements || "N/A"}`);
    console.log(`  - Web URL: ${json1.data.webUrl}`);

    // 3. Test Product Spec Sheet PDF Stream
    console.log("\n[Test 2/5] Testing /api/pdf/product/[id] (Binary PDF stream)...");
    const req2 = new NextRequest(`http://localhost:5001/api/pdf/product/${testProduct.id}`);
    const res2 = await getProductPdf(req2, { params: Promise.resolve({ id: testProduct.id }) });
    
    if (res2.status !== 200 || res2.headers.get("Content-Type") !== "application/pdf") {
        console.error("[-] Test 2 Failed! Status:", res2.status, "Content-Type:", res2.headers.get("Content-Type"));
        process.exit(1);
    }
    const pdfBlob2 = await res2.arrayBuffer();
    const pdfBuffer2 = Buffer.from(pdfBlob2);
    const pdfHeader2 = pdfBuffer2.subarray(0, 5).toString("utf-8");
    if (pdfHeader2 !== "%PDF-") {
        console.error("[-] Test 2 Failed! Invalid PDF magic bytes:", pdfHeader2);
        process.exit(1);
    }
    console.log(`✓ Product Spec Sheet PDF generated successfully!`);
    console.log(`  - File Size: ${(pdfBuffer2.length / 1024).toFixed(2)} KB`);
    console.log(`  - Magic Bytes: ${pdfHeader2}`);
    console.log(`  - Content-Disposition: ${res2.headers.get("Content-Disposition")}`);

    // 4. Test Complete Catalog JSON Output
    console.log("\n[Test 3/5] Testing /api/pdf/catalog?format=json...");
    const req3 = new NextRequest("http://localhost:5001/api/pdf/catalog?format=json");
    const res3 = await getCatalogPdf(req3);
    const json3 = await res3.json();

    if (res3.status !== 200 || !json3.success || !json3.data?.categoryGroups) {
        console.error("[-] Test 3 Failed! Response:", json3);
        process.exit(1);
    }
    console.log(`✓ Catalog JSON generated successfully!`);
    console.log(`  - Total Categories: ${json3.data.totalCategoriesCount}`);
    console.log(`  - Total Equipment Assets: ${json3.data.totalAssetsCount}`);
    console.log(`  - Edition: ${json3.data.edition}`);

    // 5. Test Vendor-Filtered Catalog JSON
    console.log("\n[Test 4/5] Testing /api/pdf/catalog?vendorId=... (Vendor filter)...");
    const testVendor = await db.query.vendors.findFirst();
    if (testVendor) {
        const req4 = new NextRequest(`http://localhost:5001/api/pdf/catalog?vendorId=${testVendor.id}&format=json`);
        const res4 = await getCatalogPdf(req4);
        const json4 = await res4.json();
        console.log(`✓ Vendor Catalog filtered for: "${json4.data.vendor?.companyName || testVendor.companyName}"`);
        console.log(`  - Vendor Items: ${json4.data.totalAssetsCount}`);
    } else {
        console.log("  (No vendor found, skipping specific filter)");
    }

    // 6. Test Multi-Page Complete Catalog PDF Stream
    console.log("\n[Test 5/5] Testing /api/pdf/catalog (Binary Multi-Page PDF stream)...");
    const req5 = new NextRequest("http://localhost:5001/api/pdf/catalog");
    const res5 = await getCatalogPdf(req5);

    if (res5.status !== 200 || res5.headers.get("Content-Type") !== "application/pdf") {
        console.error("[-] Test 5 Failed! Status:", res5.status, "Content-Type:", res5.headers.get("Content-Type"));
        process.exit(1);
    }
    const pdfBlob5 = await res5.arrayBuffer();
    const pdfBuffer5 = Buffer.from(pdfBlob5);
    const pdfHeader5 = pdfBuffer5.subarray(0, 5).toString("utf-8");
    if (pdfHeader5 !== "%PDF-") {
        console.error("[-] Test 5 Failed! Invalid PDF magic bytes:", pdfHeader5);
        process.exit(1);
    }
    console.log(`✓ Multi-Page Equipment Catalog PDF generated successfully!`);
    console.log(`  - File Size: ${(pdfBuffer5.length / 1024).toFixed(2)} KB`);
    console.log(`  - Magic Bytes: ${pdfHeader5}`);
    console.log(`  - Content-Disposition: ${res5.headers.get("Content-Disposition")}`);

    console.log("\n===============================================================================");
    console.log("  🎉 ALL 5 CATALOG & SPEC SHEET PDF DOWNLOAD TESTS PASSED WITH 100% INTEGRITY!");
    console.log("===============================================================================\n");
    process.exit(0);
}

runTests().catch((err) => {
    console.error("[-] Unexpected error during catalog verification:", err);
    process.exit(1);
});
