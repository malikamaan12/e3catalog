import { db } from "@/lib/db";
import { 
    users, vendors, clientOrganizations, organizationMembers, 
    organizationCostCenters, products, inventoryUnits 
} from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function seedDummyUsers() {
    console.log("===============================================================================");
    console.log("🌱 SEEDING COMPREHENSIVE TESTING PERSONAS FOR E3 RENTALS");
    console.log("===============================================================================\n");

    const defaultPassword = "Password123!";
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    const testUsers = [
        {
            id: "usr-super-admin-demo",
            name: "Khalid Al-Thani",
            email: "superadmin@e3rentals.com",
            role: "super_admin",
            status: "active",
            phoneNumber: "+974 5511 0001",
            designation: "Chief Executive & Platform Owner",
            companyName: "E3 Rentals Corporate",
            vendorId: null as string | null
        },
        {
            id: "usr-admin-demo",
            name: "Nasser Al-Kuwari",
            email: "admin@e3rentals.com",
            role: "admin",
            status: "active",
            phoneNumber: "+974 5511 0002",
            designation: "Director of Operations & Fleet",
            companyName: "E3 Rentals Operations",
            vendorId: null as string | null
        },
        {
            id: "usr-warehouse-demo",
            name: "Tariq Mansoor",
            email: "warehouse@e3rentals.com",
            role: "warehouse_manager",
            status: "active",
            phoneNumber: "+974 5511 0003",
            designation: "Head of Warehouse & Logistics",
            companyName: "E3 Central Distribution Center",
            vendorId: null as string | null
        },
        {
            id: "usr-sales-demo",
            name: "Sara Al-Sulaiti",
            email: "sales@e3rentals.com",
            role: "sales_rep",
            status: "active",
            phoneNumber: "+974 5511 0004",
            designation: "Senior Commercial & Accounts Manager",
            companyName: "E3 Commercial Division",
            vendorId: null as string | null
        },
        {
            id: "usr-vendor-demo",
            name: "Fahad Al-Marri",
            email: "vendor@e3rentals.com",
            role: "vendor",
            status: "active",
            phoneNumber: "+974 5511 0005",
            designation: "Managing Director",
            companyName: "Pro Audio & Staging Partners W.L.L.",
            vendorId: "VND-PRO-AUDIO"
        },
        {
            id: "usr-corporate-demo",
            name: "Dana Al-Khatib",
            email: "corporate@e3rentals.com",
            role: "client",
            status: "active",
            phoneNumber: "+974 5511 0006",
            designation: "Director of Corporate Events & Media",
            companyName: "Qatar Media Group W.L.L.",
            vendorId: null as string | null
        },
        {
            id: "usr-client-demo",
            name: "Ahmed Al-Sayed",
            email: "client@e3rentals.com",
            role: "client",
            status: "active",
            phoneNumber: "+974 5511 0007",
            designation: "Lead Event Producer",
            companyName: "Doha Live Productions",
            vendorId: null as string | null
        },
        {
            id: "usr-driver-demo",
            name: "Rashid Al-Dosari",
            email: "driver@e3rentals.com",
            role: "warehouse_manager",
            status: "active",
            phoneNumber: "+974 5511 0008",
            designation: "Lead Delivery Logistics Specialist",
            companyName: "E3 Logistics Transport",
            vendorId: null as string | null
        }
    ];

    // 1. Upsert Users
    for (const u of testUsers) {
        const existing = await db.query.users.findFirst({
            where: eq(sql`lower(${users.email})`, u.email.toLowerCase())
        });

        if (existing) {
            await db.update(users).set({
                name: u.name,
                role: u.role,
                status: "active",
                password: hashedPassword,
                phoneNumber: u.phoneNumber,
                designation: u.designation,
                companyName: u.companyName,
                vendorId: u.vendorId,
                updatedAt: new Date()
            }).where(eq(users.id, existing.id));
            u.id = existing.id; // Retain existing user ID for relations
            console.log(`✅ Updated existing user [${u.role.toUpperCase()}]: ${u.name} <${u.email}>`);
        } else {
            await db.insert(users).values({
                id: u.id,
                name: u.name,
                email: u.email.toLowerCase(),
                role: u.role,
                status: "active",
                password: hashedPassword,
                phoneNumber: u.phoneNumber,
                designation: u.designation,
                companyName: u.companyName,
                vendorId: u.vendorId,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            console.log(`✨ Created new user [${u.role.toUpperCase()}]: ${u.name} <${u.email}>`);
        }
    }

    // 2. Setup Vendor Record for vendor@e3rentals.com
    const vendorUser = testUsers.find(u => u.email === "vendor@e3rentals.com")!;
    const vendorId = "VND-PRO-AUDIO";
    const existingVendor = await db.query.vendors.findFirst({
        where: eq(vendors.id, vendorId)
    });

    if (existingVendor) {
        await db.update(vendors).set({
            userId: vendorUser.id,
            companyName: "Pro Audio & Staging Partners W.L.L.",
            tradingName: "Pro Audio Qatar",
            crNumber: "CR-98234-QA",
            taxId: "TAX-50012984",
            country: "Qatar",
            city: "Doha",
            phone: "+974 5511 0005",
            email: "vendor@e3rentals.com",
            lifecycleStatus: "approved",
            kycStatus: "approved",
            agreementStatus: "signed",
            storeStatus: "active",
            commissionRate: 15,
            commissionType: "percentage",
            commissionValue: 15,
            bankName: "Qatar National Bank (QNB)",
            accountName: "Pro Audio & Staging Partners W.L.L.",
            accountNumber: "0021-998234-001",
            iban: "QA55QNBA0000000021998234001",
            updatedAt: new Date()
        }).where(eq(vendors.id, vendorId));
        console.log(`🏢 Updated Vendor Record: "Pro Audio & Staging Partners W.L.L." (ID: ${vendorId})`);
    } else {
        await db.insert(vendors).values({
            id: vendorId,
            userId: vendorUser.id,
            companyName: "Pro Audio & Staging Partners W.L.L.",
            tradingName: "Pro Audio Qatar",
            crNumber: "CR-98234-QA",
            taxId: "TAX-50012984",
            country: "Qatar",
            city: "Doha",
            phone: "+974 5511 0005",
            email: "vendor@e3rentals.com",
            lifecycleStatus: "approved",
            kycStatus: "approved",
            agreementStatus: "signed",
            storeStatus: "active",
            commissionRate: 15,
            commissionType: "percentage",
            commissionValue: 15,
            bankName: "Qatar National Bank (QNB)",
            accountName: "Pro Audio & Staging Partners W.L.L.",
            accountNumber: "0021-998234-001",
            iban: "QA55QNBA0000000021998234001",
            createdAt: new Date(),
            updatedAt: new Date()
        });
        console.log(`🏢 Created Vendor Record: "Pro Audio & Staging Partners W.L.L." (ID: ${vendorId})`);
    }

    // Also update vendor user's vendorId
    await db.update(users).set({ vendorId }).where(eq(users.id, vendorUser.id));

    // Ensure Vendor has products and inventory
    const existingProducts = await db.select().from(products).where(eq(products.vendorId, vendorId)).limit(1);
    if (existingProducts.length === 0) {
        // Link a few unassigned or sample products to this vendor
        const allProds = await db.select().from(products).limit(8);
        for (const p of allProds) {
            await db.update(products).set({ vendorId }).where(eq(products.id, p.id));
            await db.update(inventoryUnits).set({ vendorId }).where(eq(inventoryUnits.productId, p.id));
        }
        console.log(`📦 Linked 8 catalog products and their inventory units to vendor ${vendorId}`);
    }

    // 3. Setup Corporate Client Organization for corporate@e3rentals.com
    const corpUser = testUsers.find(u => u.email === "corporate@e3rentals.com")!;
    const orgId = "org-qatar-media-group";
    const existingOrg = await db.query.clientOrganizations.findFirst({
        where: eq(clientOrganizations.id, orgId)
    });

    if (existingOrg) {
        await db.update(clientOrganizations).set({
            name: "Qatar Media Group W.L.L.",
            slug: "qatar-media-group",
            creditLimit: 150000,
            creditUsed: 14500,
            paymentTerms: "net_30",
            approvalThresholdAmount: 10000,
            status: "active",
            updatedAt: new Date()
        }).where(eq(clientOrganizations.id, orgId));
        console.log(`🏛️ Updated Corporate Organization: "Qatar Media Group W.L.L."`);
    } else {
        await db.insert(clientOrganizations).values({
            id: orgId,
            name: "Qatar Media Group W.L.L.",
            slug: "qatar-media-group",
            crNumber: "CR-112450-QA",
            taxId: "TAX-882310",
            billingAddress: "Lusail Marina Tower, Floor 14, Lusail, Qatar",
            creditLimit: 150000,
            creditUsed: 14500,
            paymentTerms: "net_30",
            approvalThresholdAmount: 10000,
            status: "active",
            createdAt: new Date(),
            updatedAt: new Date()
        });
        console.log(`🏛️ Created Corporate Organization: "Qatar Media Group W.L.L."`);
    }

    // Upsert Organization Member
    const memberId = "mem-qmg-dana";
    const existingMember = await db.query.organizationMembers.findFirst({
        where: eq(organizationMembers.organizationId, orgId)
    });

    if (existingMember) {
        await db.update(organizationMembers).set({
            userId: corpUser.id,
            role: "org_admin",
            title: "Director of Corporate Events",
            spendLimitPerBooking: 50000,
            canApprove: true,
            status: "active",
            updatedAt: new Date()
        }).where(eq(organizationMembers.id, existingMember.id));
        console.log(`👥 Updated Organization Admin membership for ${corpUser.name}`);
    } else {
        await db.insert(organizationMembers).values({
            id: memberId,
            organizationId: orgId,
            userId: corpUser.id,
            role: "org_admin",
            title: "Director of Corporate Events",
            spendLimitPerBooking: 50000,
            canApprove: true,
            status: "active",
            createdAt: new Date(),
            updatedAt: new Date()
        });
        console.log(`👥 Created Organization Admin membership for ${corpUser.name}`);
    }

    // Upsert Cost Centers
    const costCenters = [
        { id: "cc-qmg-gala", code: "CC-GALA-2026", name: "Annual Corporate Galas & Summits", budgetAmount: 200000, allocatedSpent: 45000 },
        { id: "cc-qmg-broadcast", code: "CC-BROADCAST-2026", name: "Broadcast & Media Production", budgetAmount: 150000, allocatedSpent: 12000 }
    ];

    for (const cc of costCenters) {
        const existingCC = await db.query.organizationCostCenters.findFirst({
            where: eq(organizationCostCenters.id, cc.id)
        });
        if (!existingCC) {
            await db.insert(organizationCostCenters).values({
                id: cc.id,
                organizationId: orgId,
                code: cc.code,
                name: cc.name,
                budgetAmount: cc.budgetAmount,
                allocatedSpent: cc.allocatedSpent,
                status: "active"
            });
            console.log(`💳 Created Cost Center [${cc.code}]: ${cc.name}`);
        }
    }

    console.log("\n===============================================================================");
    console.log("🎉 ALL TESTING PERSONAS AND RELATIONAL DATA SEEDED SUCCESSFULLY!");
    console.log("===============================================================================\n");
}

seedDummyUsers().catch(console.error);
