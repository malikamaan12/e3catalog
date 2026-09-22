const BASE_URL = "http://localhost:5001";

interface TestAccount {
    role: string;
    email: string;
    name: string;
    expectedRedirect: string;
}

const accounts: TestAccount[] = [
    { role: "super_admin", email: "superadmin@e3rentals.com", name: "Khalid Al-Thani", expectedRedirect: "/admin" },
    { role: "admin", email: "admin@e3rentals.com", name: "Nasser Al-Kuwari", expectedRedirect: "/admin" },
    { role: "warehouse_manager", email: "warehouse@e3rentals.com", name: "Tariq Mansoor", expectedRedirect: "/dashboard/warehouse/overview" },
    { role: "sales_rep", email: "sales@e3rentals.com", name: "Sara Al-Sulaiti", expectedRedirect: "/dashboard/sales/overview" },
    { role: "vendor", email: "vendor@e3rentals.com", name: "Fahad Al-Marri", expectedRedirect: "/dashboard" },
    { role: "client", email: "corporate@e3rentals.com", name: "Dana Al-Khatib", expectedRedirect: "/dashboard/client/overview" },
    { role: "client", email: "client@e3rentals.com", name: "Ahmed Al-Sayed", expectedRedirect: "/dashboard/client/overview" },
    { role: "warehouse_manager", email: "driver@e3rentals.com", name: "Rashid Al-Dosari", expectedRedirect: "/dashboard/warehouse/overview" },
];

async function verifyLogins() {
    console.log("===============================================================================");
    console.log("🧪 VERIFYING AUTHENTICATION & SESSIONS FOR ALL 8 DUMMY PERSONAS");
    console.log("===============================================================================\n");

    let allPassed = true;

    for (const acc of accounts) {
        // Test with Password123!
        const res1 = await fetch(`${BASE_URL}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: acc.email, password: "Password123!" }),
        });

        const data1 = await res1.json();
        const cookie1 = res1.headers.get("set-cookie");

        if (res1.ok && data1.user && data1.user.role === acc.role) {
            console.log(`✅ [${acc.role.toUpperCase()}] ${acc.name} <${acc.email}> authenticated successfully with 'Password123!'`);
        } else {
            console.error(`❌ [${acc.role.toUpperCase()}] ${acc.email} FAILED with 'Password123!':`, data1);
            allPassed = false;
        }

        // Also verify with adminpassword123
        const res2 = await fetch(`${BASE_URL}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: acc.email, password: "adminpassword123" }),
        });

        const data2 = await res2.json();
        if (res2.ok && data2.user) {
            console.log(`   ↳ Also verified fallback 'adminpassword123' (OK)`);
        } else {
            console.error(`❌ [${acc.role.toUpperCase()}] ${acc.email} FAILED with fallback 'adminpassword123':`, data2);
            allPassed = false;
        }
    }

    if (allPassed) {
        console.log("\n===============================================================================");
        console.log("🎉 ALL 8 DUMMY PERSONA CREDENTIALS FULLY VERIFIED & OPERATIONAL!");
        console.log("===============================================================================");
    } else {
        process.exit(1);
    }
}

verifyLogins().catch((err) => {
    console.error("Login verification failed:", err);
    process.exit(1);
});
