import type { Config } from "drizzle-kit";

export default {
    schema: "./src/lib/db/schema.ts",
    out: "./drizzle",
    dialect: "postgresql",
    dbCredentials: {
        url: process.env.DATABASE_URL || "postgresql://postgres:Malik12amaan%40%23@db.kwswkoysskkxuezbfmyt.supabase.co:5432/postgres",
    },
} satisfies Config;
