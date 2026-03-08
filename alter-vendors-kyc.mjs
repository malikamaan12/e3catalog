import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, 'data', 'rental.db');

async function migrate() {
    try {
        console.log(`Connecting to database at ${dbPath}...`);
        const db = new Database(dbPath);

        console.log('Adding extended KYC fields to vendors table...');

        const alterStatements = [
            "ALTER TABLE vendors ADD COLUMN tax_card_expiry TEXT;",
            "ALTER TABLE vendors ADD COLUMN company_registration_expiry TEXT;",
            "ALTER TABLE vendors ADD COLUMN bank_name TEXT;",
            "ALTER TABLE vendors ADD COLUMN account_name TEXT;",
            "ALTER TABLE vendors ADD COLUMN account_number TEXT;",
            "ALTER TABLE vendors ADD COLUMN iban TEXT;",
            "ALTER TABLE vendors ADD COLUMN swift TEXT;",
            "ALTER TABLE vendors ADD COLUMN payment_terms TEXT;",
            "ALTER TABLE vendors ADD COLUMN store_status TEXT NOT NULL DEFAULT 'active';"
        ];

        for (const stmt of alterStatements) {
            try {
                db.exec(stmt);
                console.log(`Successfully executed: ${stmt}`);
            } catch (err) {
                if (err.message.includes('duplicate column name')) {
                    console.log(`Column already exists, skipping: ${stmt}`);
                } else {
                    console.error(`Error executing: ${stmt}`, err);
                }
            }
        }

        console.log('Migration completed successfully!');
        db.close();
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
