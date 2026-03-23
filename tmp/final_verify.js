const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

const pool = new Pool({
    host: "aws-1-ap-northeast-1.pooler.supabase.com",
    port: 6543,
    user: "postgres.kwswkoysskkxuezbfmyt",
    password: "Malik12amaan@#",
    database: "postgres",
    ssl: { rejectUnauthorized: false },
});

async function runVerification() {
    const bookingId = "82e6e7d0-caaf-440b-96ca-3f62eaa05e63";
    const assetTag = "E3-LED-001-001";

    try {
        console.log("Checking unit...");
        const unitRes = await pool.query('SELECT id, product_id, vendor_id FROM inventory_units WHERE asset_tag_code = $1', [assetTag]);
        const unit = unitRes.rows[0];
        if (!unit) throw new Error("Unit not found");

        console.log("Creating assignment...");
        const assignmentId = uuidv4();
        await pool.query(
            'INSERT INTO booking_unit_assignments (id, booking_id, inventory_unit_id, assigned_at, scanned_out_at, status) VALUES ($1, $2, $3, NOW(), NOW(), $4)',
            [assignmentId, bookingId, unit.id, 'dispatched']
        );

        console.log("Updating unit status...");
        await pool.query('UPDATE inventory_units SET availability_status = $1, updated_at = NOW() WHERE id = $2', ['on_rent', unit.id]);

        console.log("Verifying results...");
        const checkUnit = await pool.query('SELECT availability_status FROM inventory_units WHERE id = $1', [unit.id]);
        console.log("Final Unit Status:", checkUnit.rows[0].availability_status);

        const checkLog = await pool.query('SELECT * FROM booking_unit_assignments WHERE id = $1', [assignmentId]);
        console.log("Final Assignment Status:", checkLog.rows[0].status);

        // Cleanup
        console.log("Cleaning up test data...");
        await pool.query('DELETE FROM booking_unit_assignments WHERE id = $1', [assignmentId]);
        await pool.query('UPDATE inventory_units SET availability_status = $1 WHERE id = $2', ['in_warehouse', unit.id]);

        console.log("Verification COMPLETE.");
    } catch (e) {
        console.error("Verification FAILED:", e);
    } finally {
        await pool.end();
    }
}

runVerification();
