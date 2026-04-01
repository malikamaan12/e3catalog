import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

if (!DB_HOST || !DB_PORT || !DB_USER || !DB_PASSWORD || !DB_NAME) {
  throw new Error('Database environment variables are missing');
}

const sql = postgres({
  host: DB_HOST,
  port: Number(DB_PORT),
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  ssl: 'require'
});

async function migrate() {
  console.log('--- Starting Migration: Add Signature Columns to Bookings ---');
  
  try {
    await sql`
      ALTER TABLE bookings 
      ADD COLUMN IF NOT EXISTS signature_data TEXT,
      ADD COLUMN IF NOT EXISTS signed_at TIMESTAMP;
    `;
    console.log('Successfully added signature_data and signed_at to bookings table.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await sql.end();
  }
}

migrate();
