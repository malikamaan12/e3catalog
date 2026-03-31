import { Pool } from 'pg';
import "dotenv/config";

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || '5432'),
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
    console.log("Creating booking_dispatch_logs table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS "booking_dispatch_logs" (
        "id" varchar(255) PRIMARY KEY NOT NULL,
        "booking_id" varchar(255) NOT NULL REFERENCES "bookings"("id") ON DELETE CASCADE,
        "driver_name" varchar(255) NOT NULL,
        "vehicle_plate_number" varchar(255) NOT NULL,
        "transport_company" varchar(255) DEFAULT 'E3 Internal Fleet' NOT NULL,
        "total_gross_weight" integer,
        "dispatched_at" timestamp DEFAULT now() NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL
      );
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS "booking_dispatch_logs_booking_id_idx"
      ON "booking_dispatch_logs" ("booking_id");
    `);

    console.log("Migration complete.");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    client.release();
    pool.end();
  }
}

run();
