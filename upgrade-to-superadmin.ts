import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    host: "aws-1-ap-northeast-1.pooler.supabase.com",
    port: 5432,
    user: "postgres.kwswkoysskkxuezbfmyt",
    password: "Malik12amaan@#",
    database: "postgres",
    ssl: { rejectUnauthorized: false },
});

// Test placeholders — you don't actually need this script anymore.
pool.end();
console.log("Pool ended.");
