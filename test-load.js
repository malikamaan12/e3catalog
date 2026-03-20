
try {
    console.log("Loading db...");
    const { db } = require("./src/lib/db");
    console.log("Loading schema...");
    const { users, vendors } = require("./src/lib/db/schema");
    console.log("Loading email...");
    const { sendVendorApprovalEmail } = require("./src/lib/email");
    console.log("Loading auth...");
    const { getCurrentUser } = require("./src/lib/auth");
    console.log("All modules loaded successfully!");
} catch (e) {
    console.error("CRITICAL IMPORT ERROR:", e);
}
