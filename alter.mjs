import Database from 'better-sqlite3';
const db = new Database('./data/rental.db');
try {
    db.exec('ALTER TABLE products ADD COLUMN requires_license INTEGER DEFAULT 0;');
} catch { console.log('requires_license exists'); }
try {
    db.exec('ALTER TABLE products ADD COLUMN requires_approval INTEGER DEFAULT 0;');
} catch { console.log('requires_approval exists'); }
db.exec(`CREATE TABLE IF NOT EXISTS "product_documents" (
    "id" text PRIMARY KEY NOT NULL,
    "product_id" text NOT NULL,
    "name" text NOT NULL,
    "url" text NOT NULL,
    "type" text NOT NULL,
    "size" integer NOT NULL,
    "uploaded_at" text NOT NULL,
    FOREIGN KEY ("product_id") REFERENCES "products"("id") ON UPDATE no action ON DELETE no action
);`);
console.log('Migration successful');
