import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function runMigration() {
    console.log("⚡ Starting Tracks 1-5 Database Migration...");

    // 1. Expand fleet_gps_pings
    await db.execute(sql`
        ALTER TABLE fleet_gps_pings 
        ADD COLUMN IF NOT EXISTS battery_pct integer DEFAULT 100,
        ADD COLUMN IF NOT EXISTS route_id varchar(255) REFERENCES dispatch_routes(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS current_zone varchar(100),
        ADD COLUMN IF NOT EXISTS distance_remaining_km real DEFAULT 0,
        ADD COLUMN IF NOT EXISTS eta_minutes integer DEFAULT 0;

        CREATE INDEX IF NOT EXISTS fleet_gps_pings_route_idx ON fleet_gps_pings(route_id);
    `);
    console.log("✓ fleet_gps_pings augmented with route telemetry");

    // 2. Track 2: Master Flight Cases & Contents
    await db.execute(sql`
        CREATE TABLE IF NOT EXISTS flight_cases (
            id varchar(255) PRIMARY KEY,
            case_number varchar(100) NOT NULL UNIQUE,
            name varchar(255) NOT NULL,
            case_type varchar(100) NOT NULL DEFAULT 'Trunk',
            asset_tag_code varchar(100) NOT NULL UNIQUE,
            rfid_tag varchar(100),
            tare_weight_kg real DEFAULT 15,
            max_capacity_kg real DEFAULT 80,
            status varchar(50) NOT NULL DEFAULT 'available',
            warehouse_location varchar(100) DEFAULT 'Zone A - Bay 1',
            notes text,
            created_at timestamp NOT NULL DEFAULT NOW(),
            updated_at timestamp NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS flight_cases_case_type_idx ON flight_cases(case_type);
        CREATE INDEX IF NOT EXISTS flight_cases_status_idx ON flight_cases(status);
        CREATE INDEX IF NOT EXISTS flight_cases_asset_tag_idx ON flight_cases(asset_tag_code);

        CREATE TABLE IF NOT EXISTS flight_case_contents (
            id varchar(255) PRIMARY KEY,
            flight_case_id varchar(255) NOT NULL REFERENCES flight_cases(id) ON DELETE CASCADE,
            inventory_unit_id varchar(255) REFERENCES inventory_units(id) ON DELETE SET NULL,
            product_id varchar(255) REFERENCES products(id) ON DELETE SET NULL,
            accessory_name varchar(255) NOT NULL,
            expected_quantity integer NOT NULL DEFAULT 1,
            is_permanent_child boolean NOT NULL DEFAULT false,
            is_verified_packed boolean NOT NULL DEFAULT true,
            verified_at timestamp,
            verified_by varchar(255) REFERENCES users(id) ON DELETE SET NULL
        );

        CREATE INDEX IF NOT EXISTS flight_case_contents_case_idx ON flight_case_contents(flight_case_id);
        CREATE INDEX IF NOT EXISTS flight_case_contents_unit_idx ON flight_case_contents(inventory_unit_id);

        CREATE TABLE IF NOT EXISTS kit_missing_item_claims (
            id varchar(255) PRIMARY KEY,
            booking_id varchar(255) REFERENCES bookings(id) ON DELETE CASCADE,
            flight_case_id varchar(255) REFERENCES flight_cases(id) ON DELETE SET NULL,
            inventory_unit_id varchar(255) REFERENCES inventory_units(id) ON DELETE SET NULL,
            item_name varchar(255) NOT NULL,
            penalty_fee real NOT NULL DEFAULT 0,
            status varchar(50) NOT NULL DEFAULT 'open',
            claim_notes text,
            filed_by varchar(255) REFERENCES users(id) ON DELETE SET NULL,
            resolved_at timestamp,
            created_at timestamp NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS kit_missing_claims_booking_idx ON kit_missing_item_claims(booking_id);
        CREATE INDEX IF NOT EXISTS kit_missing_claims_case_idx ON kit_missing_item_claims(flight_case_id);
        CREATE INDEX IF NOT EXISTS kit_missing_claims_status_idx ON kit_missing_item_claims(status);
    `);
    console.log("✓ Track 2 tables created (flight_cases, flight_case_contents, kit_missing_item_claims)");

    // 3. Track 3: Technical Crew Roles & Shift Assignments
    await db.execute(sql`
        CREATE TABLE IF NOT EXISTS event_crew_roles (
            id varchar(255) PRIMARY KEY,
            name varchar(255) NOT NULL,
            code varchar(100) NOT NULL UNIQUE,
            default_hourly_rate real NOT NULL DEFAULT 150,
            overtime_multiplier real NOT NULL DEFAULT 1.5,
            description text,
            is_active boolean NOT NULL DEFAULT true,
            created_at timestamp NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS event_crew_roles_code_idx ON event_crew_roles(code);

        CREATE TABLE IF NOT EXISTS booking_crew_assignments (
            id varchar(255) PRIMARY KEY,
            booking_id varchar(255) NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
            user_id varchar(255) REFERENCES users(id) ON DELETE SET NULL,
            crew_name varchar(255) NOT NULL,
            role_id varchar(255) REFERENCES event_crew_roles(id) ON DELETE SET NULL,
            call_time timestamp NOT NULL,
            end_time timestamp NOT NULL,
            venue_location varchar(500) NOT NULL,
            status varchar(50) NOT NULL DEFAULT 'scheduled',
            check_in_at timestamp,
            check_out_at timestamp,
            standard_hours real DEFAULT 0,
            overtime_hours real DEFAULT 0,
            hourly_rate real NOT NULL DEFAULT 150,
            labor_cost real NOT NULL DEFAULT 0,
            client_billable_rate real DEFAULT 200,
            notes text,
            created_at timestamp NOT NULL DEFAULT NOW(),
            updated_at timestamp NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS booking_crew_booking_idx ON booking_crew_assignments(booking_id);
        CREATE INDEX IF NOT EXISTS booking_crew_user_idx ON booking_crew_assignments(user_id);
        CREATE INDEX IF NOT EXISTS booking_crew_status_idx ON booking_crew_assignments(status);
        CREATE INDEX IF NOT EXISTS booking_crew_call_time_idx ON booking_crew_assignments(call_time);
    `);
    console.log("✓ Track 3 tables created (event_crew_roles, booking_crew_assignments)");

    // 4. Track 4: Corporate Client Credit Health Scoring
    await db.execute(sql`
        CREATE TABLE IF NOT EXISTS client_credit_health (
            id varchar(255) PRIMARY KEY,
            user_id varchar(255) REFERENCES users(id) ON DELETE SET NULL,
            organization_id varchar(255) REFERENCES client_organizations(id) ON DELETE CASCADE,
            client_name varchar(255) NOT NULL,
            credit_limit real NOT NULL DEFAULT 50000,
            current_outstanding real NOT NULL DEFAULT 0,
            payment_behavior_score integer NOT NULL DEFAULT 95,
            risk_tier varchar(50) NOT NULL DEFAULT 'low_risk',
            average_days_to_pay real DEFAULT 14,
            last_audited_at timestamp NOT NULL DEFAULT NOW(),
            notes text,
            updated_at timestamp NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS client_credit_org_idx ON client_credit_health(organization_id);
        CREATE INDEX IF NOT EXISTS client_credit_risk_tier_idx ON client_credit_health(risk_tier);
    `);
    console.log("✓ Track 4 tables created (client_credit_health)");

    // 5. Track 5: White-Label Client Deal Room & Digital Amendments
    await db.execute(sql`
        CREATE TABLE IF NOT EXISTS deal_rooms (
            id varchar(255) PRIMARY KEY,
            booking_id varchar(255) REFERENCES bookings(id) ON DELETE CASCADE,
            quote_id varchar(255),
            slug varchar(255) NOT NULL UNIQUE,
            title varchar(255) NOT NULL,
            access_passcode varchar(50),
            expires_at timestamp,
            allow_amendments boolean NOT NULL DEFAULT true,
            status varchar(50) NOT NULL DEFAULT 'active',
            view_count integer NOT NULL DEFAULT 0,
            last_viewed_at timestamp,
            branding_config jsonb DEFAULT '{}',
            created_at timestamp NOT NULL DEFAULT NOW(),
            updated_at timestamp NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS deal_rooms_slug_idx ON deal_rooms(slug);
        CREATE INDEX IF NOT EXISTS deal_rooms_booking_idx ON deal_rooms(booking_id);
        CREATE INDEX IF NOT EXISTS deal_rooms_status_idx ON deal_rooms(status);

        CREATE TABLE IF NOT EXISTS deal_room_amendments (
            id varchar(255) PRIMARY KEY,
            deal_room_id varchar(255) NOT NULL REFERENCES deal_rooms(id) ON DELETE CASCADE,
            requested_changes jsonb NOT NULL,
            proposed_subtotal real NOT NULL DEFAULT 0,
            status varchar(50) NOT NULL DEFAULT 'pending',
            client_comment text,
            admin_notes text,
            created_at timestamp NOT NULL DEFAULT NOW(),
            reviewed_at timestamp
        );

        CREATE INDEX IF NOT EXISTS deal_room_amendments_room_idx ON deal_room_amendments(deal_room_id);
        CREATE INDEX IF NOT EXISTS deal_room_amendments_status_idx ON deal_room_amendments(status);
    `);
    console.log("✓ Track 5 tables created (deal_rooms, deal_room_amendments)");

    console.log("🎉 All Tracks 1-5 database tables successfully migrated!");
    process.exit(0);
}

runMigration().catch(err => {
    console.error("❌ Migration failed:", err);
    process.exit(1);
});
