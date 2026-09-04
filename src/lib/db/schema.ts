import { pgTable, varchar, integer, real, boolean, timestamp, jsonb, index, text, primaryKey } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Users ───
export const users = pgTable("users", {
    id: varchar("id", { length: 255 }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    phoneNumber: varchar("phone_number", { length: 255 }),
    password: varchar("password", { length: 255 }),
    role: varchar("role", { length: 50 }).notNull().default("client"), // client | admin | super_admin | vendor | sales_rep | warehouse_manager
    image: varchar("image", { length: 255 }),
    // Company & professional details
    companyName: varchar("company_name", { length: 255 }),
    registrationNo: varchar("registration_no", { length: 255 }),
    location: varchar("location", { length: 255 }),
    address: varchar("address", { length: 500 }),
    designation: varchar("designation", { length: 255 }),
    alternatePhone: varchar("alternate_phone", { length: 255 }),
    // Default POC (can be overridden per project in projectContacts)
    pocName: varchar("poc_name", { length: 255 }),
    pocPhone: varchar("poc_phone", { length: 255 }),
    pocEmail: varchar("poc_email", { length: 255 }),
    pocDesignation: varchar("poc_designation", { length: 255 }),
    // Per-project POC overrides: JSON array
    projectContacts: jsonb("project_contacts").$type<Array<{
        projectId: string;
        name: string;
        phone: string;
        email: string;
        designation: string;
    }>>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),

    // Status & Tracking
    status: varchar("status", { length: 50 }).notNull().default("active"), // active | frozen | blocked
    lastLoginIp: varchar("last_login_ip", { length: 50 }),
    lastLoginLocation: varchar("last_login_location", { length: 255 }),
    lastActive: timestamp("last_active"),

    // Multi-Tenant Isolation
    vendorId: varchar("vendor_id", { length: 255 }), // If this user is a vendor admin or sub-admin, maps to vendors.id
}, (table) => {
    return {
        roleStatusIdx: index("users_role_status_idx").on(table.role, table.status),
        vendorIdIdx: index("users_vendor_id_idx").on(table.vendorId),
    };
});

// ─── System Logs ───
export const systemLogs = pgTable("system_logs", {
    id: varchar("id", { length: 255 }).primaryKey(),
    adminId: varchar("admin_id", { length: 255 }).notNull().references(() => users.id),
    action: varchar("action", { length: 255 }).notNull(),
    targetId: varchar("target_id", { length: 255 }),
    targetType: varchar("target_type", { length: 50 }).notNull(),
    details: varchar("details", { length: 1000 }),
    ipAddress: varchar("ip_address", { length: 50 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Vendors ───
export const vendors = pgTable("vendors", {
    id: varchar("id", { length: 255 }).primaryKey(),
    userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id).unique(),
    companyName: varchar("company_name", { length: 255 }).notNull(),
    tradingName: varchar("trading_name", { length: 255 }),
    crNumber: varchar("cr_number", { length: 255 }),
    tradeLicenseNumber: varchar("trade_license_number", { length: 255 }),
    companyType: varchar("company_type", { length: 100 }),
    country: varchar("country", { length: 100 }).default("Qatar"),
    address: varchar("address", { length: 500 }),
    city: varchar("city", { length: 100 }).default("Doha"),
    phone: varchar("phone", { length: 50 }),
    email: varchar("email", { length: 255 }),
    yearEstablished: integer("year_established"),

    // Lifecycle Status
    lifecycleStatus: varchar("lifecycle_status", { length: 50 }).notNull().default("application_draft"),
    kycStatus: varchar("kyc_status", { length: 50 }).notNull().default("pending"),
    agreementStatus: varchar("agreement_status", { length: 50 }).notNull().default("unsigned"),
    rejectionReason: varchar("rejection_reason", { length: 1000 }),
    changesRequestedReason: varchar("changes_requested_reason", { length: 1000 }),
    suspensionReason: varchar("suspension_reason", { length: 1000 }),
    approvedAt: timestamp("approved_at"),
    approvedBy: varchar("approved_by", { length: 255 }).references(() => users.id),

    // Commercial & Reliability
    payoutDetails: varchar("payout_details", { length: 500 }),
    commissionRate: real("commission_rate"), // Legacy flat rate
    commissionType: varchar("commission_type", { length: 50 }).notNull().default("percentage"),
    commissionValue: real("commission_value").notNull().default(20), // 20% default
    paymentTerms: varchar("payment_terms", { length: 255 }),
    storeStatus: varchar("store_status", { length: 50 }).notNull().default("active"),

    // Capabilities
    equipmentCategories: jsonb("equipment_categories").$type<string[]>(),
    warehouseLocations: jsonb("warehouse_locations").$type<string[]>(),
    fleetSize: varchar("fleet_size", { length: 100 }),
    operatingRegions: jsonb("operating_regions").$type<string[]>(),

    // Extended Profile & Branding
    website: varchar("website", { length: 255 }),
    taxId: varchar("tax_id", { length: 255 }),
    taxCardUrl: varchar("tax_card_url", { length: 500 }),
    companyRegistrationUrl: varchar("company_registration_url", { length: 500 }),
    letterheadHeaderUrl: varchar("letterhead_header_url", { length: 500 }),
    letterheadFooterUrl: varchar("letterhead_footer_url", { length: 500 }),
    taxCardExpiry: timestamp("tax_card_expiry"),
    companyRegistrationExpiry: timestamp("company_registration_expiry"),
    pocName: varchar("poc_name", { length: 255 }),
    pocPhone: varchar("poc_phone", { length: 255 }),
    alternatePocName: varchar("alternate_poc_name", { length: 255 }),
    alternatePocPhone: varchar("alternate_poc_phone", { length: 255 }),
    logoUrl: varchar("logo_url", { length: 500 }),
    bannerUrl: varchar("banner_url", { length: 500 }),
    brandStory: text("brand_story"),

    // Banking Details for Payouts
    bankName: varchar("bank_name", { length: 255 }),
    accountName: varchar("account_name", { length: 255 }),
    accountNumber: varchar("account_number", { length: 255 }),
    iban: varchar("iban", { length: 255 }),
    swift: varchar("swift", { length: 255 }),

    // Reliability Scores
    scoreDelivery: integer("score_delivery").default(100),
    scoreCondition: integer("score_condition").default(100),
    scoreRating: real("score_rating").default(5.0),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
    return {
        userIdIdx: index("vendors_user_id_idx").on(table.userId),
        lifecycleStatusIdx: index("vendors_lifecycle_status_idx").on(table.lifecycleStatus),
        storeStatusIdx: index("vendors_store_status_idx").on(table.storeStatus),
        scoreRatingIdx: index("vendors_score_rating_idx").on(table.scoreRating),
    };
});

// ─── Vendor Compliance Documents (KYC) ───
export const vendorDocuments = pgTable("vendor_documents", {
    id: varchar("id", { length: 255 }).primaryKey(),
    vendorId: varchar("vendor_id", { length: 255 }).notNull().references(() => vendors.id),
    documentType: varchar("document_type", { length: 100 }).notNull(), // commercial_registration | trade_license | tax_certificate | insurance | bank_proof | safety_cert | other
    fileName: varchar("file_name", { length: 255 }).notNull(),
    fileUrl: varchar("file_url", { length: 500 }).notNull(),
    fileSize: integer("file_size"),
    mimeType: varchar("mime_type", { length: 100 }),
    issueDate: timestamp("issue_date"),
    expiryDate: timestamp("expiry_date"),
    issuingAuthority: varchar("issuing_authority", { length: 255 }),
    status: varchar("status", { length: 50 }).notNull().default("uploaded"), // uploaded | under_review | verified | rejected | expired | superseded
    reviewerId: varchar("reviewer_id", { length: 255 }).references(() => users.id),
    reviewerNotes: varchar("reviewer_notes", { length: 1000 }),
    rejectionReason: varchar("rejection_reason", { length: 1000 }),
    verifiedAt: timestamp("verified_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
    return {
        vendorIdIdx: index("vendor_documents_vendor_id_idx").on(table.vendorId),
        statusIdx: index("vendor_documents_status_idx").on(table.status),
    };
});

// ─── Vendor Tenant Team Members ───
export const vendorTeamMembers = pgTable("vendor_team_members", {
    id: varchar("id", { length: 255 }).primaryKey(),
    vendorId: varchar("vendor_id", { length: 255 }).notNull().references(() => vendors.id),
    userId: varchar("user_id", { length: 255 }).references(() => users.id),
    invitedEmail: varchar("invited_email", { length: 255 }).notNull(),
    invitationToken: varchar("invitation_token", { length: 255 }).unique(),
    role: varchar("role", { length: 50 }).notNull().default("viewer"), // owner | admin | catalog_manager | operations_manager | finance_viewer | viewer
    status: varchar("status", { length: 50 }).notNull().default("pending"), // pending | active | disabled | revoked
    tokenExpiresAt: timestamp("token_expires_at"),
    acceptedAt: timestamp("accepted_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
    return {
        vendorIdIdx: index("vendor_team_members_vendor_id_idx").on(table.vendorId),
        userIdIdx: index("vendor_team_members_user_id_idx").on(table.userId),
        tokenIdx: index("vendor_team_members_token_idx").on(table.invitationToken),
    };
});

// ─── Vendor Commercial Terms (Versioned) ───
export const vendorCommercialTerms = pgTable("vendor_commercial_terms", {
    id: varchar("id", { length: 255 }).primaryKey(),
    vendorId: varchar("vendor_id", { length: 255 }).notNull().references(() => vendors.id),
    version: integer("version").notNull().default(1),
    commissionType: varchar("commission_type", { length: 50 }).notNull().default("percentage"),
    commissionValue: real("commission_value").notNull().default(20),
    effectiveDate: timestamp("effective_date").notNull().defaultNow(),
    payoutTerms: varchar("payout_terms", { length: 255 }),
    specialConditions: varchar("special_conditions", { length: 1000 }),
    approvedBy: varchar("approved_by", { length: 255 }).references(() => users.id),
    status: varchar("status", { length: 50 }).notNull().default("active"), // draft | proposed | active | superseded
    createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => {
    return {
        vendorIdIdx: index("vendor_commercial_terms_vendor_id_idx").on(table.vendorId),
        statusIdx: index("vendor_commercial_terms_status_idx").on(table.status),
    };
});

// ─── Categories ───
export const categories = pgTable("categories", {
    id: varchar("id", { length: 255 }).primaryKey(),
    parentId: varchar("parent_id", { length: 255 }),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    image: varchar("image", { length: 500 }),
    icon: varchar("icon", { length: 255 }),
    description: varchar("description", { length: 1000 }),
    sortOrder: integer("sort_order").default(0),
    active: boolean("active").notNull().default(true),
});

// ─── Global Tags (Smart Tags) ───
export const tags = pgTable("tags", {
    id: varchar("id", { length: 255 }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull().unique(), // e.g. "Mall Approved", "Outdoor Safe"
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    color: varchar("color", { length: 50 }), // For UI badging
    createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Products ───
export const products = pgTable("products", {
    id: varchar("id", { length: 255 }).primaryKey(),
    vendorId: varchar("vendor_id", { length: 255 }), // Nullable for backwards compatibility
    categoryId: varchar("category_id", { length: 255 }).notNull().references(() => categories.id),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    itemCode: varchar("item_code", { length: 100 }).unique(), // SKU / Item Code (e.g. "LGT-001")
    shortDescription: varchar("short_description", { length: 500 }),
    description: varchar("description", { length: 2000 }),
    // Specs
    dimensions: varchar("dimensions", { length: 255 }),
    weight: varchar("weight", { length: 255 }),
    powerRequirements: varchar("power_requirements", { length: 255 }),
    materials: varchar("materials", { length: 255 }),
    // Pricing
    showPrice: boolean("show_price").notNull().default(true),
    priceType: varchar("price_type", { length: 50 }).notNull().default("daily"), // daily | job | custom
    priceRangeMax: real("price_range_max"),
    pricePerDay: real("price_per_day").notNull(),
    pricePerHour: real("price_per_hour"),
    // Custom Extra Charges
    packagingFee: real("packaging_fee").default(0),
    handlingFee: real("handling_fee").default(0),
    setupFee: real("setup_fee").default(0),
    // Inventory
    unit: varchar("unit", { length: 50 }).notNull().default("unit"), // unit | set | kg | sqm | rm | ltr
    minOrderQty: integer("min_order_qty").notNull().default(1),
    // Buffer times (in hours)
    installTime: integer("install_time").default(0),
    dismantleTime: integer("dismantle_time").default(0),
    cleaningTime: integer("cleaning_time").default(0),
    // Logistics
    manpower: varchar("manpower", { length: 255 }),
    tools: varchar("tools", { length: 255 }),
    // Thumbnail for fast catalog
    thumbnailUrl: varchar("thumbnail_url", { length: 500 }),
    // Compliance
    requiresLicense: boolean("requires_license").default(false),
    requiresApproval: boolean("requires_approval").default(false),
    featured: boolean("featured").default(false),
    viewCount: integer("view_count").default(0), // Added for Catalog Demand Analytics
    averageRating: real("average_rating").default(5.0),
    reviewCount: integer("review_count").default(0),
    isPublished: boolean("is_published").default(false),
    isKit: boolean("is_kit").default(false),
    // Lifecycle Status (draft | pending_review | changes_requested | approved | published | unpublished | archived)
    status: varchar("status", { length: 50 }).notNull().default("draft"),
    brand: varchar("brand", { length: 255 }),
    model: varchar("model", { length: 255 }),
    replacementValue: real("replacement_value"),
    // SEO & Discovery
    metaTitle: varchar("meta_title", { length: 255 }),
    metaDescription: varchar("meta_description", { length: 500 }),
    keywords: varchar("keywords", { length: 500 }),
    adminNotes: varchar("admin_notes", { length: 1000 }), // Internal use only
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
    return {
        vendorIdIdx: index("products_vendor_id_idx").on(table.vendorId),
        categoryIdIdx: index("products_category_id_idx").on(table.categoryId),
        statusIdx: index("products_status_idx").on(table.status),
        featuredIdx: index("products_featured_idx").on(table.featured),
        createdAtIdx: index("products_created_at_idx").on(table.createdAt),
        ratingIdx: index("products_rating_idx").on(table.averageRating),
    };
});


// ─── Product Tags (Junction) ───
export const productTags = pgTable("product_tags", {
    id: varchar("id", { length: 255 }).primaryKey(),
    productId: varchar("product_id", { length: 255 }).notNull().references(() => products.id),
    tagId: varchar("tag_id", { length: 255 }).notNull().references(() => tags.id),
});

// ─── Vendor Warehouses ───
export const vendorWarehouses = pgTable("vendor_warehouses", {
    id: varchar("id", { length: 255 }).primaryKey(),
    vendorId: varchar("vendor_id", { length: 255 }).notNull().references(() => vendors.id),
    name: varchar("name", { length: 255 }).notNull(), // e.g. "Main Warehouse", "Industrial City Store"
    address: varchar("address", { length: 500 }),
    city: varchar("city", { length: 255 }),
    isDefault: boolean("is_default").default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── Warehouse Zones (Spatial Segregation) ───
export const warehouseZones = pgTable("warehouse_zones", {
    id: varchar("id", { length: 255 }).primaryKey(),
    warehouseId: varchar("warehouse_id", { length: 255 }).notNull().references(() => vendorWarehouses.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(), // e.g. "Audio Zone A", "Staging Dock 1", "Quarantine / Repairs"
    code: varchar("code", { length: 50 }).notNull(), // e.g. "ZN-AUD-A"
    zoneType: varchar("zone_type", { length: 50 }).notNull().default("storage"), // storage | staging | quarantine | returns | loading_dock
    color: varchar("color", { length: 50 }).default("#3b82f6"), // Visual UI badging
    description: varchar("description", { length: 500 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
    return {
        warehouseIdIdx: index("warehouse_zones_warehouse_id_idx").on(table.warehouseId),
        zoneTypeIdx: index("warehouse_zones_type_idx").on(table.zoneType),
    };
});

// ─── Warehouse Bins / Racks / Shelves ───
export const warehouseBins = pgTable("warehouse_bins", {
    id: varchar("id", { length: 255 }).primaryKey(),
    warehouseId: varchar("warehouse_id", { length: 255 }).notNull().references(() => vendorWarehouses.id, { onDelete: "cascade" }),
    zoneId: varchar("zone_id", { length: 255 }).notNull().references(() => warehouseZones.id, { onDelete: "cascade" }),
    binCode: varchar("bin_code", { length: 100 }).notNull().unique(), // e.g. "BIN-AUD-A01-R2"
    aisle: varchar("aisle", { length: 50 }),
    rack: varchar("rack", { length: 50 }),
    shelf: varchar("shelf", { length: 50 }),
    bin: varchar("bin", { length: 50 }),
    maxCapacity: integer("max_capacity").default(50),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
    return {
        warehouseIdIdx: index("warehouse_bins_warehouse_id_idx").on(table.warehouseId),
        zoneIdIdx: index("warehouse_bins_zone_id_idx").on(table.zoneId),
        binCodeIdx: index("warehouse_bins_code_idx").on(table.binCode),
    };
});

// ─── Inventory Units (Digital Product Passport) ───
export const inventoryUnits = pgTable("inventory_units", {
    id: varchar("id", { length: 255 }).primaryKey(),
    productId: varchar("product_id", { length: 255 }).notNull().references(() => products.id),
    vendorId: varchar("vendor_id", { length: 255 }).notNull().references(() => vendors.id),
    assetTagCode: varchar("asset_tag_code", { length: 255 }).notNull().unique(), // e.g. E3-TRUSS-001
    serialNumber: varchar("serial_number", { length: 255 }),
    conditionStatus: varchar("condition_status", { length: 50 }).notNull().default("excellent"),
    availabilityStatus: varchar("availability_status", { length: 50 }).notNull().default("in_warehouse"),
    lastInspectionDate: timestamp("last_inspection_date"),
    warehouseLocation: varchar("warehouse_location", { length: 255 }), // Legacy free-text
    warehouseId: varchar("warehouse_id", { length: 255 }).references(() => vendorWarehouses.id), // Structured FK
    zoneId: varchar("zone_id", { length: 255 }).references(() => warehouseZones.id),
    binId: varchar("bin_id", { length: 255 }).references(() => warehouseBins.id),
    shelfLocation: varchar("shelf_location", { length: 255 }), // e.g. "Rack A3 / Shelf 2"
    purchaseDate: timestamp("purchase_date"),
    
    // Financial & Depreciation Ledger
    acquisitionCost: real("acquisition_cost").default(0),
    salvageValue: real("salvage_value").default(0),
    usefulLifeYears: integer("useful_life_years").default(5),
    totalRentalDays: integer("total_rental_days").default(0),
    rentalDaysSinceLastMaintenance: integer("rental_days_since_last_maintenance").default(0),
    operatingHours: real("operating_hours").default(0),
    cumulativeRevenue: real("cumulative_revenue").default(0),
    cumulativeMaintenanceCost: real("cumulative_maintenance_cost").default(0),
    healthScore: integer("health_score").default(100),
    lastMaintenanceDate: timestamp("last_maintenance_date"),
    preventiveMaintenanceIntervalDays: integer("preventive_maintenance_interval_days").default(30),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
    return {
        productIdIdx: index("inventory_units_product_id_idx").on(table.productId),
        vendorIdIdx: index("inventory_units_vendor_id_idx").on(table.vendorId),
        assetTagIdx: index("inventory_units_tag_idx").on(table.assetTagCode),
        statusIdx: index("inventory_units_status_idx").on(table.availabilityStatus),
        binIdIdx: index("inventory_units_bin_id_idx").on(table.binId),
        healthScoreIdx: index("inventory_units_health_score_idx").on(table.healthScore),
    };
});

// ─── Inspection Logs (Fleet Tracking) ───
export const inspectionLogs = pgTable("inspection_logs", {
    id: varchar("id", { length: 255 }).primaryKey(),
    unitId: varchar("unit_id", { length: 255 }).notNull().references(() => inventoryUnits.id),
    inspectorId: varchar("inspector_id", { length: 255 }).notNull().references(() => users.id),
    inspectionType: varchar("inspection_type", { length: 50 }).notNull().default("routine"), // routine | damage | return | pre_rental
    conditionBefore: varchar("condition_before", { length: 50 }).notNull(),
    conditionAfter: varchar("condition_after", { length: 50 }).notNull(),
    notes: varchar("notes", { length: 2000 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => {
    return {
        unitIdIdx: index("inspection_logs_unit_id_idx").on(table.unitId),
        inspectorIdIdx: index("inspection_logs_inspector_id_idx").on(table.inspectorId),
    };
});

// ─── Maintenance Records (Fleet Servicing) ───
export const maintenanceRecords = pgTable("maintenance_records", {
    id: varchar("id", { length: 255 }).primaryKey(),
    unitId: varchar("unit_id", { length: 255 }).notNull().references(() => inventoryUnits.id),
    reportedBy: varchar("reported_by", { length: 255 }).references(() => users.id),
    issueCategory: varchar("issue_category", { length: 100 }).notNull(), // electrical | mechanical | optical | cosmetic | calibration
    severity: varchar("severity", { length: 50 }).notNull().default("medium"), // low | medium | high | critical
    assignedTechnician: varchar("assigned_technician", { length: 255 }),
    status: varchar("status", { length: 50 }).notNull().default("open"), // open | in_progress | awaiting_parts | completed | cancelled
    workNotes: text("work_notes"),
    resolutionNotes: text("resolution_notes"),
    estimatedCost: real("estimated_cost"),
    actualCost: real("actual_cost"),
    openedAt: timestamp("opened_at").notNull().defaultNow(),
    targetCompletionDate: timestamp("target_completion_date"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
    return {
        unitIdIdx: index("maintenance_records_unit_id_idx").on(table.unitId),
        statusIdx: index("maintenance_records_status_idx").on(table.status),
        openedAtIdx: index("maintenance_records_opened_at_idx").on(table.openedAt),
    };
});

// ─── Pricing Rules & Global Charges ───
export const globalCharges = pgTable("global_charges", {
    id: varchar("id", { length: 255 }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull(), // e.g. "Delivery Zone A", "Floor Access Premium"
    description: varchar("description", { length: 500 }),
    chargeType: varchar("charge_type", { length: 50 }).notNull().default("fixed"), // fixed | percent
    amount: real("amount").notNull(),
    autoApplyToAll: boolean("auto_apply_to_all").default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const pricingRules = pgTable("pricing_rules", {
    id: varchar("id", { length: 255 }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    conditions: jsonb("conditions").notNull(), /* e.g. { "distance_km_min": 10, "distance_km_max": 50 } */
    chargeId: varchar("charge_id", { length: 255 }).notNull().references(() => globalCharges.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Product Documents ───
export const productDocuments = pgTable("product_documents", {
    id: varchar("id", { length: 255 }).primaryKey(),
    productId: varchar("product_id", { length: 255 }).notNull().references(() => products.id),
    name: varchar("name", { length: 255 }).notNull(),
    url: varchar("url", { length: 500 }).notNull(),
    type: varchar("type", { length: 50 }).notNull(),
    size: integer("size").notNull(),
    uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
});

// ─── Product Media ───
export const productMedia = pgTable("product_media", {
    id: varchar("id", { length: 255 }).primaryKey(),
    productId: varchar("product_id", { length: 255 }).notNull().references(() => products.id),
    type: varchar("type", { length: 50 }).notNull(), // image | video | model3d
    url: varchar("url", { length: 500 }).notNull(),
    thumbnailUrl: varchar("thumbnail_url", { length: 500 }),
    alt: varchar("alt", { length: 255 }),
    sortOrder: integer("sort_order").default(0),
});

// ─── Safety Certificates (Trackable) ───
export const safetyCertificates = pgTable("safety_certificates", {
    id: varchar("id", { length: 255 }).primaryKey(),
    productId: varchar("product_id", { length: 255 }).notNull().references(() => products.id),
    certName: varchar("cert_name", { length: 255 }).notNull(),
    certNumber: varchar("cert_number", { length: 255 }),
    issuingBody: varchar("issuing_body", { length: 255 }),
    issueDate: timestamp("issue_date").notNull(),
    expiryDate: timestamp("expiry_date").notNull(), // Vital for Expiry Tracking System
});

// ─── Installation Guides ───
export const installationGuides = pgTable("installation_guides", {
    id: varchar("id", { length: 255 }).primaryKey(),
    productId: varchar("product_id", { length: 255 }).notNull().references(() => products.id),
    guideType: varchar("guide_type", { length: 50 }).notNull(), // install | operate | dismantle
    content: varchar("content", { length: 5000 }).notNull(),
    requiredManpower: integer("required_manpower"),
    estimatedTime: varchar("estimated_time", { length: 255 }),
    toolsRequired: varchar("tools_required", { length: 500 }),
});

// ─── Bookings ───
export const bookings = pgTable("bookings", {
    id: varchar("id", { length: 255 }).primaryKey(),
    vendorId: varchar("vendor_id", { length: 255 }),
    productId: varchar("product_id", { length: 255 }).notNull().references(() => products.id),
    units: integer("units").notNull().default(1),
    startDate: timestamp("start_date").notNull(),
    endDate: timestamp("end_date").notNull(),
    startTime: varchar("start_time", { length: 10 }), // HH:mm for multi-shift
    endTime: varchar("end_time", { length: 10 }),     // HH:mm for multi-shift
    status: varchar("status", { length: 50 }).notNull().default("request"), // request | quote_sent | approved | booked | cancelled | undelivered
    paymentStatus: varchar("payment_status", { length: 50 }).notNull().default("unpaid"), // unpaid | deposit_paid | paid
    bufferBefore: integer("buffer_before").default(0), // hours
    bufferAfter: integer("buffer_after").default(0),   // hours

    // Fulfillment
    fulfillmentStatus: varchar("fulfillment_status", { length: 50 }).notNull().default("pending"), // pending | packing | packed | out_for_delivery | delivered | returned
    warehouseNotes: varchar("warehouse_notes", { length: 1000 }),

    // User Link
    userId: varchar("user_id", { length: 255 }).references(() => users.id),
    projectId: varchar("project_id", { length: 255 }),
    projectName: varchar("project_name", { length: 255 }),

    // Legacy / Guest fields
    customerName: varchar("customer_name", { length: 255 }).notNull(),
    customerEmail: varchar("customer_email", { length: 255 }).notNull(),
    customerPhone: varchar("customer_phone", { length: 255 }),

    // Admin interaction & pricing
    totalPrice: real("total_price"),
    discount: real("discount").default(0),
    logisticsCost: real("logistics_cost").default(0),
    laborCost: real("labor_cost").default(0),
    additionalChargeName: varchar("additional_charge_name", { length: 255 }),
    additionalChargeAmount: real("additional_charge_amount").default(0),
    additionalChargeType: varchar("additional_charge_type", { length: 50 }).default("fixed"),

    // Notes
    notes: varchar("notes", { length: 2000 }),
    adminNotes: varchar("admin_notes", { length: 2000 }),
    clientNotes: varchar("client_notes", { length: 2000 }),

    // PDF Customization
    selectedTerms: jsonb("selected_terms").$type<string[]>(),
    paymentTerms: varchar("payment_terms", { length: 500 }),
    paymentMethod: varchar("payment_method", { length: 500 }),
    customNotes: varchar("custom_notes", { length: 2000 }),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),

    addedByAdmin: boolean("added_by_admin").default(false),
    adminItemNote: varchar("admin_item_note", { length: 1000 }),

    // Digital Sign-Off
    signatureData: text("signature_data"), // Base64 signature
    signedAt: timestamp("signed_at"),

    // Enterprise Corporate Account Linkage
    organizationId: varchar("organization_id", { length: 255 }),
    costCenterId: varchar("cost_center_id", { length: 255 }),
    internalApprovalStatus: varchar("internal_approval_status", { length: 50 }).notNull().default("not_required"), // not_required | pending_approval | approved | rejected
    internalApprovedAt: timestamp("internal_approved_at"),
    internalApprovedBy: varchar("internal_approved_by", { length: 255 }),
}, (table) => {
    return {
        productIdIdx: index("bookings_product_id_idx").on(table.productId),
        projectIdIdx: index("bookings_project_id_idx").on(table.projectId),
        userIdIdx: index("bookings_user_id_idx").on(table.userId),
        vendorIdIdx: index("bookings_vendor_id_idx").on(table.vendorId),
        statusIdx: index("bookings_status_idx").on(table.status),
        startDateIdx: index("bookings_start_date_idx").on(table.startDate),
        endDateIdx: index("bookings_end_date_idx").on(table.endDate),
        orgIdIdx: index("bookings_organization_id_idx").on(table.organizationId),
        costCenterIdx: index("bookings_cost_center_id_idx").on(table.costCenterId),
        internalApprovalIdx: index("bookings_internal_approval_idx").on(table.internalApprovalStatus),
    };
});

// ─── Financial Ledger / Commission Engine ───
export const vendorLedgers = pgTable("vendor_ledgers", {
    id: varchar("id", { length: 255 }).primaryKey(),
    vendorId: varchar("vendor_id", { length: 255 }).notNull().references(() => vendors.id),
    bookingId: varchar("booking_id", { length: 255 }).notNull().references(() => bookings.id),
    projectId: varchar("project_id", { length: 255 }),
    amount: real("amount").notNull(),            // Vendor's total item value (subtotal)
    commissionRate: real("commission_rate").notNull(), // The % taken by the platform (e.g. 20)
    platformFee: real("platform_fee").notNull(), // E3's cut in currency
    vendorPayout: real("vendor_payout").notNull(), // Vendor's net
    status: varchar("status", { length: 50 }).notNull().default("pending_payout"), // pending_payout | paid | disputed
    notes: varchar("notes", { length: 1000 }),   // Admin details over payout transfers
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
    return {
        vendorIdIdx: index("vendor_ledgers_vendor_id_idx").on(table.vendorId),
        bookingIdIdx: index("vendor_ledgers_booking_id_idx").on(table.bookingId),
        statusIdx: index("vendor_ledgers_status_idx").on(table.status),
    };
});

// ─── Commission Settlements (Receivables) ───
export const commissionSettlements = pgTable("commission_settlements", {
    id: varchar("id", { length: 255 }).primaryKey(),
    vendorId: varchar("vendor_id", { length: 255 }).notNull().references(() => vendors.id),
    bookingId: varchar("booking_id", { length: 255 }).notNull().references(() => bookings.id),
    amountOwed: real("amount_owed").notNull(),
    status: varchar("status", { length: 50 }).notNull().default("pending"), // pending | submitted_for_review | approved_paid | overdue
    paymentEvidenceUrl: varchar("payment_evidence_url", { length: 500 }),
    adminNotes: varchar("admin_notes", { length: 1000 }),
    submittedAt: timestamp("submitted_at"),
    approvedAt: timestamp("approved_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
    return {
        vendorIdIdx: index("commission_settlements_vendor_id_idx").on(table.vendorId),
        bookingIdIdx: index("commission_settlements_booking_id_idx").on(table.bookingId),
        statusIdx: index("commission_settlements_status_idx").on(table.status),
    };
});

// ─── Booking Unit Assignments (The physical bridge) ───
export const bookingUnitAssignments = pgTable("booking_unit_assignments", {
    id: varchar("id", { length: 255 }).primaryKey(),
    bookingId: varchar("booking_id", { length: 255 }).notNull().references(() => bookings.id),
    inventoryUnitId: varchar("inventory_unit_id", { length: 255 }).notNull().references(() => inventoryUnits.id),
    assignedAt: timestamp("assigned_at").notNull().defaultNow(),
    scannedOutAt: timestamp("scanned_out_at"), // Bump-In
    scannedInAt: timestamp("scanned_in_at"),   // Bump-Out
    status: varchar("status", { length: 50 }).notNull().default("reserved"), // reserved | dispatched | returned
}, (table) => {
    return {
        bookingIdIdx: index("booking_unit_assignments_booking_id_idx").on(table.bookingId),
        unitIdIdx: index("booking_unit_assignments_unit_id_idx").on(table.inventoryUnitId),
    };
});

// ─── Dispatch Logs (Transport Manifest) ───
export const bookingDispatchLogs = pgTable("booking_dispatch_logs", {
    id: varchar("id", { length: 255 }).primaryKey(),
    bookingId: varchar("booking_id", { length: 255 }).notNull().references(() => bookings.id),
    driverName: varchar("driver_name", { length: 255 }).notNull(),
    vehiclePlateNumber: varchar("vehicle_plate_number", { length: 255 }).notNull(),
    transportCompany: varchar("transport_company", { length: 255 }).notNull().default("E3 Internal Fleet"),
    totalGrossWeight: integer("total_gross_weight"), // Derived dynamically at dispatch
    dispatchedAt: timestamp("dispatched_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => {
    return {
        bookingIdIdx: index("booking_dispatch_logs_booking_id_idx").on(table.bookingId),
    };
});

// ─── Cart Items ───
export const cartItems = pgTable("cart_items", {
    id: varchar("id", { length: 255 }).primaryKey(),
    sessionId: varchar("session_id", { length: 255 }).notNull(),
    userId: varchar("user_id", { length: 255 }).references(() => users.id),
    productId: varchar("product_id", { length: 255 }).notNull().references(() => products.id),
    quantity: integer("quantity").notNull().default(1),
    startDate: timestamp("start_date").notNull(),
    endDate: timestamp("end_date").notNull(),
    startTime: varchar("start_time", { length: 10 }),
    endTime: varchar("end_time", { length: 10 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => {
    return {
        sessionIdIdx: index("cart_items_session_id_idx").on(table.sessionId),
        userIdIdx: index("cart_items_user_id_idx").on(table.userId),
        productIdIdx: index("cart_items_product_id_idx").on(table.productId),
    };
});

// ─── Inter-Warehouse Transfers ───
export const warehouseTransfers = pgTable("warehouse_transfers", {
    id: varchar("id", { length: 255 }).primaryKey(),
    transferNumber: varchar("transfer_number", { length: 100 }).notNull().unique(), // e.g. "TRF-2026-001"
    sourceWarehouseId: varchar("source_warehouse_id", { length: 255 }).notNull().references(() => vendorWarehouses.id),
    destWarehouseId: varchar("dest_warehouse_id", { length: 255 }).notNull().references(() => vendorWarehouses.id),
    status: varchar("status", { length: 50 }).notNull().default("draft"), // draft | requested | approved | in_transit | received | cancelled
    requestedBy: varchar("requested_by", { length: 255 }).references(() => users.id),
    dispatchedBy: varchar("dispatched_by", { length: 255 }).references(() => users.id),
    receivedBy: varchar("received_by", { length: 255 }).references(() => users.id),
    driverName: varchar("driver_name", { length: 255 }),
    vehiclePlate: varchar("vehicle_plate", { length: 100 }),
    driverPhone: varchar("driver_phone", { length: 50 }),
    notes: text("notes"),
    dispatchedAt: timestamp("dispatched_at"),
    receivedAt: timestamp("received_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
    return {
        sourceIdx: index("warehouse_transfers_source_idx").on(table.sourceWarehouseId),
        destIdx: index("warehouse_transfers_dest_idx").on(table.destWarehouseId),
        statusIdx: index("warehouse_transfers_status_idx").on(table.status),
    };
});

export const warehouseTransferItems = pgTable("warehouse_transfer_items", {
    id: varchar("id", { length: 255 }).primaryKey(),
    transferId: varchar("transfer_id", { length: 255 }).notNull().references(() => warehouseTransfers.id, { onDelete: "cascade" }),
    productId: varchar("product_id", { length: 255 }).notNull().references(() => products.id),
    inventoryUnitId: varchar("inventory_unit_id", { length: 255 }).references(() => inventoryUnits.id),
    requestedQuantity: integer("requested_quantity").notNull().default(1),
    transferredQuantity: integer("transferred_quantity").notNull().default(1),
    status: varchar("status", { length: 50 }).notNull().default("pending"), // pending | loaded | received | discrepancy
    createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => {
    return {
        transferIdIdx: index("warehouse_transfer_items_transfer_idx").on(table.transferId),
        unitIdIdx: index("warehouse_transfer_items_unit_idx").on(table.inventoryUnitId),
    };
});

// ─── Warehouse Pick Lists & Wave Picking ───
export const warehousePickLists = pgTable("warehouse_pick_lists", {
    id: varchar("id", { length: 255 }).primaryKey(),
    pickNumber: varchar("pick_number", { length: 100 }).notNull().unique(), // e.g. "PCK-2026-001"
    bookingId: varchar("booking_id", { length: 255 }).notNull().references(() => bookings.id, { onDelete: "cascade" }),
    warehouseId: varchar("warehouse_id", { length: 255 }).references(() => vendorWarehouses.id),
    stagingBay: varchar("staging_bay", { length: 100 }), // e.g. "Bay 04 - Dispatch Gate A"
    status: varchar("status", { length: 50 }).notNull().default("pending"), // pending | picking | packed | staged | loaded | dispatched
    assignedPickerId: varchar("assigned_picker_id", { length: 255 }).references(() => users.id),
    packedAt: timestamp("packed_at"),
    stagedAt: timestamp("staged_at"),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
    return {
        bookingIdIdx: index("warehouse_pick_lists_booking_idx").on(table.bookingId),
        statusIdx: index("warehouse_pick_lists_status_idx").on(table.status),
        stagingBayIdx: index("warehouse_pick_lists_bay_idx").on(table.stagingBay),
    };
});

export const warehousePickItems = pgTable("warehouse_pick_items", {
    id: varchar("id", { length: 255 }).primaryKey(),
    pickListId: varchar("pick_list_id", { length: 255 }).notNull().references(() => warehousePickLists.id, { onDelete: "cascade" }),
    productId: varchar("product_id", { length: 255 }).notNull().references(() => products.id),
    inventoryUnitId: varchar("inventory_unit_id", { length: 255 }).references(() => inventoryUnits.id),
    requiredQty: integer("required_qty").notNull().default(1),
    pickedQty: integer("picked_qty").notNull().default(0),
    isAccessory: boolean("is_accessory").default(false),
    accessoryName: varchar("accessory_name", { length: 255 }),
    isVerified: boolean("is_verified").default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => {
    return {
        pickListIdIdx: index("warehouse_pick_items_pick_idx").on(table.pickListId),
        unitIdIdx: index("warehouse_pick_items_unit_idx").on(table.inventoryUnitId),
    };
});

// ─── Inventory Cycle Counts ───
export const inventoryCycleCounts = pgTable("inventory_cycle_counts", {
    id: varchar("id", { length: 255 }).primaryKey(),
    countNumber: varchar("count_number", { length: 100 }).notNull().unique(), // e.g. "CNT-2026-001"
    warehouseId: varchar("warehouse_id", { length: 255 }).notNull().references(() => vendorWarehouses.id),
    zoneId: varchar("zone_id", { length: 255 }).references(() => warehouseZones.id),
    title: varchar("title", { length: 255 }).notNull(), // e.g. "Q3 Audio Zone Physical Audit"
    status: varchar("status", { length: 50 }).notNull().default("planned"), // planned | in_progress | completed | reconciled
    countedById: varchar("counted_by_id", { length: 255 }).references(() => users.id),
    totalExpectedUnits: integer("total_expected_units").default(0),
    totalScannedUnits: integer("total_scanned_units").default(0),
    discrepancyCount: integer("discrepancy_count").default(0),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    reconciledAt: timestamp("reconciled_at"),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
    return {
        warehouseIdIdx: index("inventory_cycle_counts_wh_idx").on(table.warehouseId),
        zoneIdIdx: index("inventory_cycle_counts_zone_idx").on(table.zoneId),
        statusIdx: index("inventory_cycle_counts_status_idx").on(table.status),
    };
});

export const cycleCountItems = pgTable("cycle_count_items", {
    id: varchar("id", { length: 255 }).primaryKey(),
    cycleCountId: varchar("cycle_count_id", { length: 255 }).notNull().references(() => inventoryCycleCounts.id, { onDelete: "cascade" }),
    inventoryUnitId: varchar("inventory_unit_id", { length: 255 }).references(() => inventoryUnits.id),
    productId: varchar("product_id", { length: 255 }).references(() => products.id),
    expectedBinId: varchar("expected_bin_id", { length: 255 }).references(() => warehouseBins.id),
    scannedBinId: varchar("scanned_bin_id", { length: 255 }).references(() => warehouseBins.id),
    expectedStatus: varchar("expected_status", { length: 50 }),
    scannedStatus: varchar("scanned_status", { length: 50 }),
    discrepancyType: varchar("discrepancy_type", { length: 50 }), // none | missing | wrong_bin | condition_mismatch | unregistered
    isResolved: boolean("is_resolved").default(false),
    resolutionNotes: text("resolution_notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => {
    return {
        cycleCountIdIdx: index("cycle_count_items_count_idx").on(table.cycleCountId),
        unitIdIdx: index("cycle_count_items_unit_idx").on(table.inventoryUnitId),
    };
});

// ─── Proof of Delivery (POD & Sign-on-Glass) ───
export const proofOfDeliveries = pgTable("proof_of_deliveries", {
    id: varchar("id", { length: 255 }).primaryKey(),
    bookingId: varchar("booking_id", { length: 255 }).notNull().references(() => bookings.id, { onDelete: "cascade" }),
    dispatchLogId: varchar("dispatch_log_id", { length: 255 }).references(() => bookingDispatchLogs.id),
    driverId: varchar("driver_id", { length: 255 }).references(() => users.id),
    driverName: varchar("driver_name", { length: 255 }),
    recipientName: varchar("recipient_name", { length: 255 }).notNull(),
    recipientPhone: varchar("recipient_phone", { length: 50 }),
    recipientNationalId: varchar("recipient_national_id", { length: 100 }), // Qatar ID / Passport
    signatureData: text("signature_data").notNull(), // Vectorized Base64 PNG signature
    photoUrls: jsonb("photo_urls").default([]), // Handover photo proof
    deliveryStatus: varchar("delivery_status", { length: 50 }).notNull().default("delivered"), // delivered | partial_delivery | delivery_rejected
    notes: text("notes"),
    latitude: real("latitude"),
    longitude: real("longitude"),
    deliveredAt: timestamp("delivered_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => {
    return {
        bookingIdIdx: index("proof_of_deliveries_booking_id_idx").on(table.bookingId),
        driverIdIdx: index("proof_of_deliveries_driver_id_idx").on(table.driverId),
        statusIdx: index("proof_of_deliveries_status_idx").on(table.deliveryStatus),
    };
});

// ─── Digital Rental Agreements (Contracts & E-Signatures) ───
export const rentalAgreements = pgTable("rental_agreements", {
    id: varchar("id", { length: 255 }).primaryKey(),
    agreementNumber: varchar("agreement_number", { length: 100 }).notNull().unique(), // e.g. AGR-2026-001
    bookingId: varchar("booking_id", { length: 255 }).notNull().references(() => bookings.id, { onDelete: "cascade" }),
    projectId: varchar("project_id", { length: 255 }),
    clientId: varchar("client_id", { length: 255 }).notNull().references(() => users.id),
    status: varchar("status", { length: 50 }).notNull().default("draft"), // draft | pending_signature | signed | voided
    contractTerms: text("contract_terms").notNull(),
    replacementValueTotal: real("replacement_value_total").default(0),
    securityDepositAmount: real("security_deposit_amount").default(0),
    signedByClientName: varchar("signed_by_client_name", { length: 255 }),
    signedByClientQid: varchar("signed_by_client_qid", { length: 100 }),
    clientSignatureData: text("client_signature_data"), // Base64 signature
    signedAt: timestamp("signed_at"),
    ipAddress: varchar("ip_address", { length: 100 }),
    userAgent: varchar("user_agent", { length: 500 }),
    pdfUrl: varchar("pdf_url", { length: 500 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
    return {
        bookingIdIdx: index("rental_agreements_booking_id_idx").on(table.bookingId),
        clientIdIdx: index("rental_agreements_client_id_idx").on(table.clientId),
        statusIdx: index("rental_agreements_status_idx").on(table.status),
    };
});

// ─── Spare Parts Catalog & Inventory ───
export const spareParts = pgTable("spare_parts", {
    id: varchar("id", { length: 255 }).primaryKey(),
    vendorId: varchar("vendor_id", { length: 255 }).references(() => vendors.id),
    warehouseId: varchar("warehouse_id", { length: 255 }).references(() => vendorWarehouses.id),
    partNumber: varchar("part_number", { length: 100 }).notNull().unique(), // e.g. PRT-PWR-CON20
    name: varchar("name", { length: 255 }).notNull(),
    category: varchar("category", { length: 50 }).notNull().default("cables"), // electrical | optical | mechanical | rigging | cables
    stockQuantity: integer("stock_quantity").notNull().default(0),
    minStockThreshold: integer("min_stock_threshold").notNull().default(5),
    unitCost: real("unit_cost").notNull().default(0),
    description: text("description"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
    return {
        partNumberIdx: index("spare_parts_part_number_idx").on(table.partNumber),
        categoryIdx: index("spare_parts_category_idx").on(table.category),
        warehouseIdIdx: index("spare_parts_warehouse_id_idx").on(table.warehouseId),
    };
});

// ─── Maintenance Work Orders ───
export const maintenanceWorkOrders = pgTable("maintenance_work_orders", {
    id: varchar("id", { length: 255 }).primaryKey(),
    workOrderNumber: varchar("work_order_number", { length: 100 }).notNull().unique(), // e.g. WO-2026-001
    unitId: varchar("unit_id", { length: 255 }).notNull().references(() => inventoryUnits.id),
    maintenanceRecordId: varchar("maintenance_record_id", { length: 255 }).references(() => maintenanceRecords.id),
    assignedTechnicianId: varchar("assigned_technician_id", { length: 255 }).references(() => users.id),
    technicianName: varchar("technician_name", { length: 255 }),
    status: varchar("status", { length: 50 }).notNull().default("open"), // open | in_progress | awaiting_parts | qc_testing | completed | scrapped
    priority: varchar("priority", { length: 50 }).notNull().default("medium"), // low | medium | high | urgent
    reportedIssue: text("reported_issue").notNull(),
    diagnosticNotes: text("diagnostic_notes"),
    resolutionNotes: text("resolution_notes"),
    laborHours: real("labor_hours").notNull().default(0),
    laborRatePerHour: real("labor_rate_per_hour").notNull().default(50), // Default QAR 50/hr
    totalPartsCost: real("total_parts_cost").notNull().default(0),
    totalRepairCost: real("total_repair_cost").notNull().default(0),
    electricalSafetyTested: boolean("electrical_safety_tested").notNull().default(false), // PAT inspection flag
    patCertificateNumber: varchar("pat_certificate_number", { length: 100 }),
    patPassedAt: timestamp("pat_passed_at"),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
    return {
        unitIdIdx: index("maintenance_work_orders_unit_id_idx").on(table.unitId),
        statusIdx: index("maintenance_work_orders_status_idx").on(table.status),
        priorityIdx: index("maintenance_work_orders_priority_idx").on(table.priority),
    };
});

// ─── Maintenance Parts Usage (Deduction junction) ───
export const maintenancePartsUsage = pgTable("maintenance_parts_usage", {
    id: varchar("id", { length: 255 }).primaryKey(),
    workOrderId: varchar("work_order_id", { length: 255 }).notNull().references(() => maintenanceWorkOrders.id, { onDelete: "cascade" }),
    sparePartId: varchar("spare_part_id", { length: 255 }).notNull().references(() => spareParts.id),
    quantityUsed: integer("quantity_used").notNull().default(1),
    unitCost: real("unit_cost").notNull(),
    totalCost: real("total_cost").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => {
    return {
        workOrderIdIdx: index("maintenance_parts_usage_wo_idx").on(table.workOrderId),
        sparePartIdIdx: index("maintenance_parts_usage_part_idx").on(table.sparePartId),
    };
});

// ─── Vendor Settlement Statements (Remittance & Self-Billing) ───
export const vendorSettlementStatements = pgTable("vendor_settlement_statements", {
    id: varchar("id", { length: 255 }).primaryKey(),
    statementNumber: varchar("statement_number", { length: 100 }).notNull().unique(), // e.g. VSS-2026-001
    vendorId: varchar("vendor_id", { length: 255 }).notNull().references(() => vendors.id),
    periodStart: timestamp("period_start").notNull(),
    periodEnd: timestamp("period_end").notNull(),
    totalBookingsCount: integer("total_bookings_count").notNull().default(0),
    grossRentalRevenue: real("gross_rental_revenue").notNull().default(0),
    platformCommissionTotal: real("platform_commission_total").notNull().default(0),
    netPayableToVendor: real("net_payable_to_vendor").notNull().default(0),
    status: varchar("status", { length: 50 }).notNull().default("draft"), // draft | generated | approved | paid | disputed
    bankName: varchar("bank_name", { length: 255 }),
    bankIban: varchar("bank_iban", { length: 100 }),
    transactionReference: varchar("transaction_reference", { length: 100 }), // Wire / Cheque Reference
    paidAt: timestamp("paid_at"),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
    return {
        vendorIdIdx: index("vendor_settlement_statements_vendor_idx").on(table.vendorId),
        statusIdx: index("vendor_settlement_statements_status_idx").on(table.status),
    };
});

// ─── Settlement Statement Items ───
export const settlementStatementItems = pgTable("settlement_statement_items", {
    id: varchar("id", { length: 255 }).primaryKey(),
    statementId: varchar("statement_id", { length: 255 }).notNull().references(() => vendorSettlementStatements.id, { onDelete: "cascade" }),
    bookingId: varchar("booking_id", { length: 255 }).notNull().references(() => bookings.id),
    bookingAmount: real("booking_amount").notNull(),
    commissionRate: real("commission_rate").notNull().default(15), // Default 15%
    commissionAmount: real("commission_amount").notNull(),
    vendorEarnings: real("vendor_earnings").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => {
    return {
        statementIdIdx: index("settlement_statement_items_statement_idx").on(table.statementId),
        bookingIdIdx: index("settlement_statement_items_booking_idx").on(table.bookingId),
    };
});

// ─── On-Site Booking Extensions ───
export const bookingExtensions = pgTable("booking_extensions", {
    id: varchar("id", { length: 255 }).primaryKey(),
    bookingId: varchar("booking_id", { length: 255 }).notNull().references(() => bookings.id, { onDelete: "cascade" }),
    requestedDays: integer("requested_days").notNull(),
    originalEndDate: timestamp("original_end_date").notNull(),
    newEndDate: timestamp("new_end_date").notNull(),
    additionalAmount: real("additional_amount").notNull().default(0),
    reason: text("reason"),
    status: varchar("status", { length: 50 }).notNull().default("approved"), // pending | approved | rejected
    approvedBy: varchar("approved_by", { length: 255 }).references(() => users.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => {
    return {
        bookingIdIdx: index("booking_extensions_booking_idx").on(table.bookingId),
    };
});

// ─── Product Kit Items (Bill of Materials) ───
export const productKitItems = pgTable("product_kit_items", {
    id: varchar("id", { length: 255 }).primaryKey(),
    parentProductId: varchar("parent_product_id", { length: 255 }).notNull().references(() => products.id, { onDelete: "cascade" }),
    childProductId: varchar("child_product_id", { length: 255 }).notNull().references(() => products.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull().default(1),
    isOptional: boolean("is_optional").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => {
    return {
        parentProductIdx: index("product_kit_items_parent_idx").on(table.parentProductId),
        childProductIdx: index("product_kit_items_child_idx").on(table.childProductId),
    };
});

// ─── Damage Claims & Security Deposit Deductions ───
export const damageClaims = pgTable("damage_claims", {
    id: varchar("id", { length: 255 }).primaryKey(),
    claimNumber: varchar("claim_number", { length: 100 }).notNull().unique(), // e.g. CLM-2026-001
    bookingId: varchar("booking_id", { length: 255 }).notNull().references(() => bookings.id, { onDelete: "cascade" }),
    inventoryUnitId: varchar("inventory_unit_id", { length: 255 }).references(() => inventoryUnits.id),
    inspectionLogId: varchar("inspection_log_id", { length: 255 }).references(() => inspectionLogs.id),
    incidentDescription: text("incident_description").notNull(),
    photoUrls: jsonb("photo_urls").$type<string[]>().default([]),
    severity: varchar("severity", { length: 50 }).notNull().default("moderate"), // minor | moderate | severe | total_loss
    partsCost: real("parts_cost").notNull().default(0),
    laborCost: real("labor_cost").notNull().default(0),
    totalClaimAmount: real("total_claim_amount").notNull().default(0),
    securityDepositHeld: real("security_deposit_held").notNull().default(0),
    amountDeducted: real("amount_deducted").notNull().default(0),
    amountRefunded: real("amount_refunded").notNull().default(0),
    status: varchar("status", { length: 50 }).notNull().default("filed"), // draft | filed | settled_deducted | disputed | waived
    filedBy: varchar("filed_by", { length: 255 }).references(() => users.id),
    settledAt: timestamp("settled_at"),
    clientDisputeReason: text("client_dispute_reason"),
    adminResolutionNotes: text("admin_resolution_notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
    return {
        bookingIdx: index("damage_claims_booking_idx").on(table.bookingId),
        unitIdx: index("damage_claims_unit_idx").on(table.inventoryUnitId),
        statusIdx: index("damage_claims_status_idx").on(table.status),
    };
});

// ─── Sub-Rentals & Cross-Hiring Orders (B2B Sourcing) ───
export const crossHireOrders = pgTable("cross_hire_orders", {
    id: varchar("id", { length: 255 }).primaryKey(),
    orderNumber: varchar("order_number", { length: 100 }).notNull().unique(), // e.g. XHIRE-2026-001
    bookingId: varchar("booking_id", { length: 255 }).references(() => bookings.id, { onDelete: "set null" }),
    supplierVendorId: varchar("supplier_vendor_id", { length: 255 }).references(() => vendors.id),
    supplierName: varchar("supplier_name", { length: 255 }).notNull(),
    supplierContact: varchar("supplier_contact", { length: 255 }),
    productId: varchar("product_id", { length: 255 }).notNull().references(() => products.id),
    unitsRequested: integer("units_requested").notNull().default(1),
    periodStart: timestamp("period_start").notNull(),
    periodEnd: timestamp("period_end").notNull(),
    supplierDailyRate: real("supplier_daily_rate").notNull().default(0),
    clientDailyRate: real("client_daily_rate").notNull().default(0),
    totalSupplierCost: real("total_supplier_cost").notNull().default(0),
    totalClientRevenue: real("total_client_revenue").notNull().default(0),
    profitMargin: real("profit_margin").notNull().default(0),
    status: varchar("status", { length: 50 }).notNull().default("requested"), // requested | confirmed | received | deployed | returned | cancelled
    assetTagAllocations: jsonb("asset_tag_allocations").$type<string[]>().default([]),
    notes: text("notes"),
    createdById: varchar("created_by_id", { length: 255 }).references(() => users.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
    return {
        bookingIdx: index("cross_hire_orders_booking_idx").on(table.bookingId),
        productIdx: index("cross_hire_orders_product_idx").on(table.productId),
        statusIdx: index("cross_hire_orders_status_idx").on(table.status),
    };
});

// ─── Real-Time Fleet Dispatch GPS Telemetry ───
export const fleetGpsPings = pgTable("fleet_gps_pings", {
    id: varchar("id", { length: 255 }).primaryKey(),
    dispatchLogId: varchar("dispatch_log_id", { length: 255 }).notNull().references(() => bookingDispatchLogs.id, { onDelete: "cascade" }),
    driverId: varchar("driver_id", { length: 255 }).references(() => users.id),
    vehiclePlate: varchar("vehicle_plate", { length: 100 }),
    latitude: real("latitude").notNull(),
    longitude: real("longitude").notNull(),
    heading: real("heading"),
    speed: real("speed"),
    status: varchar("status", { length: 50 }).notNull().default("in_transit"), // departed | in_transit | arrived | unloading | completed
    createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => {
    return {
        dispatchLogIdx: index("fleet_gps_pings_dispatch_idx").on(table.dispatchLogId),
        createdAtIdx: index("fleet_gps_pings_created_idx").on(table.createdAt),
    };
});

// ─── Enterprise Client Organizations ───
export const clientOrganizations = pgTable("client_organizations", {
    id: varchar("id", { length: 255 }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    crNumber: varchar("cr_number", { length: 100 }),
    taxId: varchar("tax_id", { length: 100 }),
    billingAddress: varchar("billing_address", { length: 500 }),
    creditLimit: real("credit_limit").notNull().default(50000), // Default QAR 50,000 corporate line
    creditUsed: real("credit_used").notNull().default(0),
    paymentTerms: varchar("payment_terms", { length: 100 }).notNull().default("net_30"), // due_on_receipt | net_15 | net_30 | net_60
    approvalThresholdAmount: real("approval_threshold_amount").notNull().default(5000), // Orders above this require internal sign-off
    status: varchar("status", { length: 50 }).notNull().default("active"), // active | suspended | pending_review
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
    return {
        slugIdx: index("client_organizations_slug_idx").on(table.slug),
        statusIdx: index("client_organizations_status_idx").on(table.status),
    };
});

// ─── Corporate Organization Members ───
export const organizationMembers = pgTable("organization_members", {
    id: varchar("id", { length: 255 }).primaryKey(),
    organizationId: varchar("organization_id", { length: 255 }).notNull().references(() => clientOrganizations.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 50 }).notNull().default("member"), // org_admin | approver | member | finance
    title: varchar("title", { length: 100 }), // e.g. "Director of Production"
    spendLimitPerBooking: real("spend_limit_per_booking").notNull().default(5000),
    canApprove: boolean("can_approve").notNull().default(false),
    status: varchar("status", { length: 50 }).notNull().default("active"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
    return {
        orgUserIdx: index("org_members_org_user_idx").on(table.organizationId, table.userId),
        userIdIdx: index("org_members_user_idx").on(table.userId),
        roleIdx: index("org_members_role_idx").on(table.role),
    };
});

// ─── Corporate Project Cost Centers ───
export const organizationCostCenters = pgTable("organization_cost_centers", {
    id: varchar("id", { length: 255 }).primaryKey(),
    organizationId: varchar("organization_id", { length: 255 }).notNull().references(() => clientOrganizations.id, { onDelete: "cascade" }),
    code: varchar("code", { length: 50 }).notNull(), // e.g. "CC-QND-2026"
    name: varchar("name", { length: 255 }).notNull(),
    budgetAmount: real("budget_amount").notNull().default(100000),
    allocatedSpent: real("allocated_spent").notNull().default(0),
    status: varchar("status", { length: 50 }).notNull().default("active"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
    return {
        orgIdx: index("org_cost_centers_org_idx").on(table.organizationId),
        codeIdx: index("org_cost_centers_code_idx").on(table.code),
    };
});

// ─── Booking Corporate Approval Requisitions ───
export const bookingApprovalRequests = pgTable("booking_approval_requests", {
    id: varchar("id", { length: 255 }).primaryKey(),
    bookingId: varchar("booking_id", { length: 255 }).notNull().references(() => bookings.id, { onDelete: "cascade" }),
    organizationId: varchar("organization_id", { length: 255 }).notNull().references(() => clientOrganizations.id, { onDelete: "cascade" }),
    costCenterId: varchar("cost_center_id", { length: 255 }).references(() => organizationCostCenters.id),
    requestedById: varchar("requested_by_id", { length: 255 }).notNull().references(() => users.id),
    approverId: varchar("approver_id", { length: 255 }).references(() => users.id),
    amount: real("amount").notNull(),
    thresholdTriggered: boolean("threshold_triggered").notNull().default(false),
    status: varchar("status", { length: 50 }).notNull().default("pending"), // pending | approved | rejected | bypassed
    notes: text("notes"),
    decidedAt: timestamp("decided_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
    return {
        bookingIdx: index("booking_approval_requests_booking_idx").on(table.bookingId),
        orgIdx: index("booking_approval_requests_org_idx").on(table.organizationId),
        statusIdx: index("booking_approval_requests_status_idx").on(table.status),
    };
});

// ─── Relations ───
export const categoriesRelations = relations(categories, ({ many }) => ({
    products: many(products),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
    productTags: many(productTags),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
    category: one(categories, {
        fields: [products.categoryId],
        references: [categories.id],
    }),
    vendor: one(vendors, {
        fields: [products.vendorId],
        references: [vendors.id],
    }),
    media: many(productMedia),
    documents: many(productDocuments),
    safetyCertificates: many(safetyCertificates),
    installationGuides: many(installationGuides),
    bookings: many(bookings),
    inventoryOverrides: many(inventoryOverrides),
    inventoryUnits: many(inventoryUnits),
    productTags: many(productTags),
    reviews: many(reviews),
}));

export const productTagsRelations = relations(productTags, ({ one }) => ({
    product: one(products, {
        fields: [productTags.productId],
        references: [products.id],
    }),
    tag: one(tags, {
        fields: [productTags.tagId],
        references: [tags.id],
    }),
}));

export const vendorsRelations = relations(vendors, ({ one, many }) => ({
    user: one(users, {
        fields: [vendors.userId],
        references: [users.id],
    }),
    products: many(products),
    documents: many(vendorDocuments),
    teamMembers: many(vendorTeamMembers),
    commercialTerms: many(vendorCommercialTerms),
    warehouses: many(vendorWarehouses),
    inventoryUnits: many(inventoryUnits),
    ledgers: many(vendorLedgers),
    settlements: many(commissionSettlements),
    settlementStatements: many(vendorSettlementStatements),
    reviews: many(reviews),
}));

export const vendorDocumentsRelations = relations(vendorDocuments, ({ one }) => ({
    vendor: one(vendors, {
        fields: [vendorDocuments.vendorId],
        references: [vendors.id],
    }),
    reviewer: one(users, {
        fields: [vendorDocuments.reviewerId],
        references: [users.id],
    }),
}));

export const vendorTeamMembersRelations = relations(vendorTeamMembers, ({ one }) => ({
    vendor: one(vendors, {
        fields: [vendorTeamMembers.vendorId],
        references: [vendors.id],
    }),
    user: one(users, {
        fields: [vendorTeamMembers.userId],
        references: [users.id],
    }),
}));

export const vendorCommercialTermsRelations = relations(vendorCommercialTerms, ({ one }) => ({
    vendor: one(vendors, {
        fields: [vendorCommercialTerms.vendorId],
        references: [vendors.id],
    }),
    approver: one(users, {
        fields: [vendorCommercialTerms.approvedBy],
        references: [users.id],
    }),
}));

export const vendorWarehousesRelations = relations(vendorWarehouses, ({ one, many }) => ({
    vendor: one(vendors, {
        fields: [vendorWarehouses.vendorId],
        references: [vendors.id],
    }),
    zones: many(warehouseZones),
    bins: many(warehouseBins),
    inventoryUnits: many(inventoryUnits),
    transfersAsSource: many(warehouseTransfers, { relationName: "sourceTransfers" }),
    transfersAsDest: many(warehouseTransfers, { relationName: "destTransfers" }),
    pickLists: many(warehousePickLists),
    cycleCounts: many(inventoryCycleCounts),
}));

export const warehouseZonesRelations = relations(warehouseZones, ({ one, many }) => ({
    warehouse: one(vendorWarehouses, {
        fields: [warehouseZones.warehouseId],
        references: [vendorWarehouses.id],
    }),
    bins: many(warehouseBins),
    inventoryUnits: many(inventoryUnits),
}));

export const warehouseBinsRelations = relations(warehouseBins, ({ one, many }) => ({
    warehouse: one(vendorWarehouses, {
        fields: [warehouseBins.warehouseId],
        references: [vendorWarehouses.id],
    }),
    zone: one(warehouseZones, {
        fields: [warehouseBins.zoneId],
        references: [warehouseZones.id],
    }),
    inventoryUnits: many(inventoryUnits),
}));

export const inventoryUnitsRelations = relations(inventoryUnits, ({ one, many }) => ({
    product: one(products, {
        fields: [inventoryUnits.productId],
        references: [products.id],
    }),
    vendor: one(vendors, {
        fields: [inventoryUnits.vendorId],
        references: [vendors.id],
    }),
    warehouse: one(vendorWarehouses, {
        fields: [inventoryUnits.warehouseId],
        references: [vendorWarehouses.id],
    }),
    zone: one(warehouseZones, {
        fields: [inventoryUnits.zoneId],
        references: [warehouseZones.id],
    }),
    bin: one(warehouseBins, {
        fields: [inventoryUnits.binId],
        references: [warehouseBins.id],
    }),
    inspectionLogs: many(inspectionLogs),
    maintenanceRecords: many(maintenanceRecords),
    workOrders: many(maintenanceWorkOrders),
}));

export const warehouseTransfersRelations = relations(warehouseTransfers, ({ one, many }) => ({
    sourceWarehouse: one(vendorWarehouses, {
        fields: [warehouseTransfers.sourceWarehouseId],
        references: [vendorWarehouses.id],
        relationName: "sourceTransfers",
    }),
    destWarehouse: one(vendorWarehouses, {
        fields: [warehouseTransfers.destWarehouseId],
        references: [vendorWarehouses.id],
        relationName: "destTransfers",
    }),
    requester: one(users, {
        fields: [warehouseTransfers.requestedBy],
        references: [users.id],
    }),
    items: many(warehouseTransferItems),
}));

export const warehouseTransferItemsRelations = relations(warehouseTransferItems, ({ one }) => ({
    transfer: one(warehouseTransfers, {
        fields: [warehouseTransferItems.transferId],
        references: [warehouseTransfers.id],
    }),
    product: one(products, {
        fields: [warehouseTransferItems.productId],
        references: [products.id],
    }),
    inventoryUnit: one(inventoryUnits, {
        fields: [warehouseTransferItems.inventoryUnitId],
        references: [inventoryUnits.id],
    }),
}));

export const warehousePickListsRelations = relations(warehousePickLists, ({ one, many }) => ({
    booking: one(bookings, {
        fields: [warehousePickLists.bookingId],
        references: [bookings.id],
    }),
    warehouse: one(vendorWarehouses, {
        fields: [warehousePickLists.warehouseId],
        references: [vendorWarehouses.id],
    }),
    assignedPicker: one(users, {
        fields: [warehousePickLists.assignedPickerId],
        references: [users.id],
    }),
    items: many(warehousePickItems),
}));

export const warehousePickItemsRelations = relations(warehousePickItems, ({ one }) => ({
    pickList: one(warehousePickLists, {
        fields: [warehousePickItems.pickListId],
        references: [warehousePickLists.id],
    }),
    product: one(products, {
        fields: [warehousePickItems.productId],
        references: [products.id],
    }),
    inventoryUnit: one(inventoryUnits, {
        fields: [warehousePickItems.inventoryUnitId],
        references: [inventoryUnits.id],
    }),
}));

export const inventoryCycleCountsRelations = relations(inventoryCycleCounts, ({ one, many }) => ({
    warehouse: one(vendorWarehouses, {
        fields: [inventoryCycleCounts.warehouseId],
        references: [vendorWarehouses.id],
    }),
    zone: one(warehouseZones, {
        fields: [inventoryCycleCounts.zoneId],
        references: [warehouseZones.id],
    }),
    countedBy: one(users, {
        fields: [inventoryCycleCounts.countedById],
        references: [users.id],
    }),
    items: many(cycleCountItems),
}));

export const cycleCountItemsRelations = relations(cycleCountItems, ({ one }) => ({
    cycleCount: one(inventoryCycleCounts, {
        fields: [cycleCountItems.cycleCountId],
        references: [inventoryCycleCounts.id],
    }),
    inventoryUnit: one(inventoryUnits, {
        fields: [cycleCountItems.inventoryUnitId],
        references: [inventoryUnits.id],
    }),
    product: one(products, {
        fields: [cycleCountItems.productId],
        references: [products.id],
    }),
    expectedBin: one(warehouseBins, {
        fields: [cycleCountItems.expectedBinId],
        references: [warehouseBins.id],
    }),
    scannedBin: one(warehouseBins, {
        fields: [cycleCountItems.scannedBinId],
        references: [warehouseBins.id],
    }),
}));

export const inspectionLogsRelations = relations(inspectionLogs, ({ one }) => ({
    unit: one(inventoryUnits, {
        fields: [inspectionLogs.unitId],
        references: [inventoryUnits.id],
    }),
    inspector: one(users, {
        fields: [inspectionLogs.inspectorId],
        references: [users.id],
    }),
}));

export const maintenanceRecordsRelations = relations(maintenanceRecords, ({ one }) => ({
    unit: one(inventoryUnits, {
        fields: [maintenanceRecords.unitId],
        references: [inventoryUnits.id],
    }),
    reporter: one(users, {
        fields: [maintenanceRecords.reportedBy],
        references: [users.id],
    }),
}));

export const productDocumentsRelations = relations(productDocuments, ({ one }) => ({
    product: one(products, {
        fields: [productDocuments.productId],
        references: [products.id],
    }),
}));

export const productMediaRelations = relations(productMedia, ({ one }) => ({
    product: one(products, {
        fields: [productMedia.productId],
        references: [products.id],
    }),
}));

export const safetyCertificatesRelations = relations(safetyCertificates, ({ one }) => ({
    product: one(products, {
        fields: [safetyCertificates.productId],
        references: [products.id],
    }),
}));

export const installationGuidesRelations = relations(installationGuides, ({ one }) => ({
    product: one(products, {
        fields: [installationGuides.productId],
        references: [products.id],
    }),
}));

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
    product: one(products, {
        fields: [bookings.productId],
        references: [products.id],
    }),
    vendor: one(vendors, {
        fields: [bookings.vendorId],
        references: [vendors.id],
    }),
    user: one(users, {
        fields: [bookings.userId],
        references: [users.id],
    }),
    review: one(reviews, {
        fields: [bookings.id],
        references: [reviews.bookingId]
    }),
    dispatchLog: one(bookingDispatchLogs, {
        fields: [bookings.id],
        references: [bookingDispatchLogs.bookingId]
    }),
    proofOfDelivery: one(proofOfDeliveries, {
        fields: [bookings.id],
        references: [proofOfDeliveries.bookingId]
    }),
    agreements: many(rentalAgreements),
    extensions: many(bookingExtensions),
    unitAssignments: many(bookingUnitAssignments),
}));

export const bookingDispatchLogsRelations = relations(bookingDispatchLogs, ({ one }) => ({
    booking: one(bookings, {
        fields: [bookingDispatchLogs.bookingId],
        references: [bookings.id],
    }),
}));

export const bookingUnitAssignmentsRelations = relations(bookingUnitAssignments, ({ one }) => ({
    booking: one(bookings, {
        fields: [bookingUnitAssignments.bookingId],
        references: [bookings.id],
    }),
    inventoryUnit: one(inventoryUnits, {
        fields: [bookingUnitAssignments.inventoryUnitId],
        references: [inventoryUnits.id],
    }),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
    product: one(products, {
        fields: [cartItems.productId],
        references: [products.id],
    }),
    user: one(users, {
        fields: [cartItems.userId],
        references: [users.id],
    }),
}));

export const vendorLedgersRelations = relations(vendorLedgers, ({ one }) => ({
    vendor: one(vendors, {
        fields: [vendorLedgers.vendorId],
        references: [vendors.id],
    }),
    booking: one(bookings, {
        fields: [vendorLedgers.bookingId],
        references: [bookings.id],
    }),
}));

export const commissionSettlementsRelations = relations(commissionSettlements, ({ one }) => ({
    vendor: one(vendors, {
        fields: [commissionSettlements.vendorId],
        references: [vendors.id],
    }),
    booking: one(bookings, {
        fields: [commissionSettlements.bookingId],
        references: [bookings.id],
    }),
}));

export const usersRelations = relations(users, ({ many }) => ({
    bookings: many(bookings),
    cartItems: many(cartItems),
    notifications: many(notifications),
    sentMessages: many(chatMessages, { relationName: "sentMessages" }),
    receivedMessages: many(chatMessages, { relationName: "receivedMessages" }),
    systemLogs: many(systemLogs),
    vendorProfile: many(vendors),
    reviews: many(reviews),
}));

export const systemLogsRelations = relations(systemLogs, ({ one }) => ({
    admin: one(users, {
        fields: [systemLogs.adminId],
        references: [users.id],
    }),
}));

// ─── Inventory Overrides ───
export const inventoryOverrides = pgTable("inventory_overrides", {
    id: varchar("id", { length: 255 }).primaryKey(),
    productId: varchar("product_id", { length: 255 }).notNull().references(() => products.id),
    startDate: timestamp("start_date").notNull(),
    endDate: timestamp("end_date").notNull(),
    unitsOffline: integer("units_offline").notNull(),
    reason: varchar("reason", { length: 255 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const inventoryOverridesRelations = relations(inventoryOverrides, ({ one }) => ({
    product: one(products, {
        fields: [inventoryOverrides.productId],
        references: [products.id],
    }),
}));

// ─── Admin Settings ───
export const adminSettings = pgTable("admin_settings", {
    id: varchar("id", { length: 255 }).primaryKey(),
    type: varchar("type", { length: 50 }).notNull(),
    label: varchar("label", { length: 255 }).notNull(),
    content: varchar("content", { length: 2000 }).notNull(),
    isDefault: boolean("is_default").default(false),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Site Settings ───
export const siteSettings = pgTable("site_settings", {
    id: varchar("id", { length: 255 }).primaryKey(),
    key: varchar("key", { length: 255 }).notNull().unique(),
    value: text("value").notNull(),
    group: varchar("group", { length: 50 }).notNull().default("general"),
    description: varchar("description", { length: 500 }),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── Notifications ───
export const notifications = pgTable("notifications", {
    id: varchar("id", { length: 255 }).primaryKey(),
    userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
    bookingId: varchar("booking_id", { length: 255 }),
    title: varchar("title", { length: 255 }).notNull(),
    message: varchar("message", { length: 1000 }).notNull(),
    type: varchar("type", { length: 50 }).notNull(),
    channel: varchar("channel", { length: 50 }).notNull().default("in_app"), // in_app | email | whatsapp
    isRead: boolean("is_read").default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const notificationsRelations = relations(notifications, ({ one }) => ({
    user: one(users, {
        fields: [notifications.userId],
        references: [users.id],
    }),
}));

// ─── Chat Messages ───
export const chatMessages = pgTable("chat_messages", {
    id: varchar("id", { length: 255 }).primaryKey(),
    senderId: varchar("sender_id", { length: 255 }).notNull().references(() => users.id),
    receiverId: varchar("receiver_id", { length: 255 }).notNull().references(() => users.id),
    projectId: varchar("project_id", { length: 255 }),
    bookingId: varchar("booking_id", { length: 255 }).references(() => bookings.id),
    content: varchar("content", { length: 2000 }).notNull(),
    attachmentUrl: varchar("attachment_url", { length: 500 }),
    attachmentType: varchar("attachment_type", { length: 50 }),
    attachmentName: varchar("attachment_name", { length: 255 }),
    isRead: boolean("is_read").default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
    sender: one(users, {
        fields: [chatMessages.senderId],
        references: [users.id],
        relationName: "sentMessages",
    }),
    receiver: one(users, {
        fields: [chatMessages.receiverId],
        references: [users.id],
        relationName: "receivedMessages",
    }),
    booking: one(bookings, {
        fields: [chatMessages.bookingId],
        references: [bookings.id],
    }),
}));

// ─── Verified Reviews ───
export const reviews = pgTable("reviews", {
    id: varchar("id", { length: 255 }).primaryKey(),
    bookingId: varchar("booking_id", { length: 255 }).notNull().references(() => bookings.id).unique(),
    productId: varchar("product_id", { length: 255 }).notNull().references(() => products.id),
    vendorId: varchar("vendor_id", { length: 255 }).references(() => vendors.id), // Can be null if platform-owned
    userId: varchar("user_id", { length: 255 }).references(() => users.id), // The client who left the review
    customerName: varchar("customer_name", { length: 255 }).notNull(),
    rating: integer("rating").notNull(), // 1 to 5
    conditionScore: integer("condition_score"), // 1 to 5
    deliveryScore: integer("delivery_score"), // 1 to 5
    comment: varchar("comment", { length: 2000 }),
    isVerified: boolean("is_verified").default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const reviewsRelations = relations(reviews, ({ one }) => ({
    booking: one(bookings, {
        fields: [reviews.bookingId],
        references: [bookings.id],
    }),
    product: one(products, {
        fields: [reviews.productId],
        references: [products.id],
    }),
    vendor: one(vendors, {
        fields: [reviews.vendorId],
        references: [vendors.id],
    }),
    user: one(users, {
        fields: [reviews.userId],
        references: [users.id],
    }),
}));

// ─── Staging Inventory (Warehouse Migration Tool) ───
// Isolated table — never mixed with live products.
// Used during physical warehouse transfers to count unknown assets
// before converting them to live Products + Digital Passports (inventory_units).
export const stagingInventory = pgTable("staging_inventory", {
    id: varchar("id", { length: 255 }).primaryKey(),
    // The vendor who owns this staging batch (nullable — platform-managed items allowed)
    vendorId: varchar("vendor_id", { length: 255 }).references(() => vendors.id),
    // Rough product identity captured on the warehouse floor
    roughName: varchar("rough_name", { length: 255 }).notNull().default(""),
    roughImageUrl: varchar("rough_image_url", { length: 500 }),
    roughCategory: varchar("rough_category", { length: 255 }), // free-text hint, e.g. "Chairs"
    // Physical specs (free-text, filled quickly on tablet)
    dimensions: varchar("dimensions", { length: 255 }), // e.g. "50×50×100 cm"
    weight: varchar("weight", { length: 100 }),          // e.g. "12 kg"
    technicalNotes: text("technical_notes"),
    // Counting
    countedQuantity: integer("counted_quantity").notNull().default(0),
    // Lifecycle
    migrationStatus: varchar("migration_status", { length: 50 }).notNull().default("counting"), // counting | migrated
    // If migrated, track the resulting product
    migratedProductId: varchar("migrated_product_id", { length: 255 }).references(() => products.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
    return {
        vendorIdIdx: index("staging_inventory_vendor_id_idx").on(table.vendorId),
        statusIdx: index("staging_inventory_status_idx").on(table.migrationStatus),
    };
});

export const stagingInventoryRelations = relations(stagingInventory, ({ one }) => ({
    vendor: one(vendors, {
        fields: [stagingInventory.vendorId],
        references: [vendors.id],
    }),
    migratedProduct: one(products, {
        fields: [stagingInventory.migratedProductId],
        references: [products.id],
    }),
}));

// ─── Customer Invoices ───
export const invoices = pgTable("invoices", {
    id: varchar("id", { length: 255 }).primaryKey(),
    invoiceNumber: varchar("invoice_number", { length: 100 }).notNull().unique(), // e.g. INV-2026-0001
    bookingId: varchar("booking_id", { length: 255 }).references(() => bookings.id),
    projectId: varchar("project_id", { length: 255 }),
    userId: varchar("user_id", { length: 255 }).references(() => users.id),
    customerName: varchar("customer_name", { length: 255 }).notNull(),
    customerEmail: varchar("customer_email", { length: 255 }),
    customerPhone: varchar("customer_phone", { length: 100 }),
    invoiceType: varchar("invoice_type", { length: 50 }).notNull().default("deposit"), // deposit | progress | final | standard
    currency: varchar("currency", { length: 10 }).notNull().default("QAR"),
    subtotal: real("subtotal").notNull().default(0),
    discount: real("discount").notNull().default(0),
    logisticsCost: real("logistics_cost").notNull().default(0),
    laborCost: real("labor_cost").notNull().default(0),
    additionalCharges: real("additional_charges").notNull().default(0),
    taxAmount: real("tax_amount").notNull().default(0),
    totalAmount: real("total_amount").notNull().default(0),
    amountPaid: real("amount_paid").notNull().default(0),
    amountDue: real("amount_due").notNull().default(0),
    status: varchar("status", { length: 50 }).notNull().default("draft"), // draft | issued | partially_paid | paid | cancelled | credited
    issueDate: timestamp("issue_date").notNull().defaultNow(),
    dueDate: timestamp("due_date").notNull(),
    paymentTerms: varchar("payment_terms", { length: 255 }).default("50% Advance, 50% on Delivery"),
    notes: text("notes"),
    pdfUrl: varchar("pdf_url", { length: 500 }),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
    return {
        invoiceNumberIdx: index("invoices_invoice_number_idx").on(table.invoiceNumber),
        bookingIdIdx: index("invoices_booking_id_idx").on(table.bookingId),
        projectIdIdx: index("invoices_project_id_idx").on(table.projectId),
        userIdIdx: index("invoices_user_id_idx").on(table.userId),
        statusIdx: index("invoices_status_idx").on(table.status),
        dueDateIdx: index("invoices_due_date_idx").on(table.dueDate),
    };
});

// ─── Invoice Items ───
export const invoiceItems = pgTable("invoice_items", {
    id: varchar("id", { length: 255 }).primaryKey(),
    invoiceId: varchar("invoice_id", { length: 255 }).notNull().references(() => invoices.id),
    bookingId: varchar("booking_id", { length: 255 }).references(() => bookings.id),
    productId: varchar("product_id", { length: 255 }).references(() => products.id),
    description: varchar("description", { length: 500 }).notNull(),
    units: integer("units").notNull().default(1),
    days: integer("days").notNull().default(1),
    unitPrice: real("unit_price").notNull().default(0),
    lineTotal: real("line_total").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => {
    return {
        invoiceIdIdx: index("invoice_items_invoice_id_idx").on(table.invoiceId),
        productIdIdx: index("invoice_items_product_id_idx").on(table.productId),
    };
});

// ─── Client Payments ───
export const clientPayments = pgTable("client_payments", {
    id: varchar("id", { length: 255 }).primaryKey(),
    paymentNumber: varchar("payment_number", { length: 100 }).notNull().unique(), // e.g. PAY-2026-0001
    invoiceId: varchar("invoice_id", { length: 255 }).references(() => invoices.id),
    bookingId: varchar("booking_id", { length: 255 }).references(() => bookings.id),
    projectId: varchar("project_id", { length: 255 }),
    userId: varchar("user_id", { length: 255 }).references(() => users.id),
    amount: real("amount").notNull(),
    currency: varchar("currency", { length: 10 }).notNull().default("QAR"),
    paymentMethod: varchar("payment_method", { length: 50 }).notNull().default("bank_transfer"), // bank_transfer | credit_card | cheque | cash
    transactionRef: varchar("transaction_ref", { length: 255 }),
    paymentProofUrl: varchar("payment_proof_url", { length: 500 }),
    status: varchar("status", { length: 50 }).notNull().default("pending_verification"), // pending_verification | verified | rejected
    verifiedBy: varchar("verified_by", { length: 255 }).references(() => users.id),
    verifiedAt: timestamp("verified_at"),
    rejectionReason: varchar("rejection_reason", { length: 500 }),
    notes: text("notes"),
    paymentDate: timestamp("payment_date").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
    return {
        paymentNumberIdx: index("client_payments_payment_number_idx").on(table.paymentNumber),
        invoiceIdIdx: index("client_payments_invoice_id_idx").on(table.invoiceId),
        projectIdIdx: index("client_payments_project_id_idx").on(table.projectId),
        userIdIdx: index("client_payments_user_id_idx").on(table.userId),
        statusIdx: index("client_payments_status_idx").on(table.status),
    };
});

// ─── Credit Notes ───
export const creditNotes = pgTable("credit_notes", {
    id: varchar("id", { length: 255 }).primaryKey(),
    creditNoteNumber: varchar("credit_note_number", { length: 100 }).notNull().unique(), // e.g. CN-2026-0001
    invoiceId: varchar("invoice_id", { length: 255 }).notNull().references(() => invoices.id),
    bookingId: varchar("booking_id", { length: 255 }).references(() => bookings.id),
    userId: varchar("user_id", { length: 255 }).references(() => users.id),
    amount: real("amount").notNull(),
    currency: varchar("currency", { length: 10 }).notNull().default("QAR"),
    reason: varchar("reason", { length: 500 }).notNull(),
    status: varchar("status", { length: 50 }).notNull().default("draft"), // draft | issued | applied | refunded
    issuedBy: varchar("issued_by", { length: 255 }).references(() => users.id),
    issuedAt: timestamp("issued_at"),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
    return {
        creditNoteNumberIdx: index("credit_notes_credit_note_number_idx").on(table.creditNoteNumber),
        invoiceIdIdx: index("credit_notes_invoice_id_idx").on(table.invoiceId),
        userIdIdx: index("credit_notes_user_id_idx").on(table.userId),
        statusIdx: index("credit_notes_status_idx").on(table.status),
    };
});

// ─── Refunds ───
export const refunds = pgTable("refunds", {
    id: varchar("id", { length: 255 }).primaryKey(),
    refundNumber: varchar("refund_number", { length: 100 }).notNull().unique(), // e.g. REF-2026-0001
    creditNoteId: varchar("credit_note_id", { length: 255 }).references(() => creditNotes.id),
    paymentId: varchar("payment_id", { length: 255 }).references(() => clientPayments.id),
    userId: varchar("user_id", { length: 255 }).references(() => users.id),
    amount: real("amount").notNull(),
    currency: varchar("currency", { length: 10 }).notNull().default("QAR"),
    refundMethod: varchar("refund_method", { length: 50 }).notNull().default("bank_transfer"),
    transactionRef: varchar("transaction_ref", { length: 255 }),
    reason: varchar("reason", { length: 500 }).notNull(),
    status: varchar("status", { length: 50 }).notNull().default("pending"), // pending | processed | failed
    processedBy: varchar("processed_by", { length: 255 }).references(() => users.id),
    processedAt: timestamp("processed_at"),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
    return {
        refundNumberIdx: index("refunds_refund_number_idx").on(table.refundNumber),
        creditNoteIdIdx: index("refunds_credit_note_id_idx").on(table.creditNoteId),
        statusIdx: index("refunds_status_idx").on(table.status),
    };
});

// ─── Financial Journals (Double-Entry General Ledger) ───
export const financialJournals = pgTable("financial_journals", {
    id: varchar("id", { length: 255 }).primaryKey(),
    journalNumber: varchar("journal_number", { length: 100 }).notNull().unique(), // e.g. JRN-2026-0001
    referenceType: varchar("reference_type", { length: 50 }).notNull(), // invoice | payment | credit_note | payout | settlement | reversal
    referenceId: varchar("reference_id", { length: 255 }).notNull(),
    description: varchar("description", { length: 500 }).notNull(),
    isReversed: boolean("is_reversed").default(false),
    reversalJournalId: varchar("reversal_journal_id", { length: 255 }),
    postedAt: timestamp("posted_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => {
    return {
        journalNumberIdx: index("financial_journals_journal_number_idx").on(table.journalNumber),
        referenceIdx: index("financial_journals_reference_idx").on(table.referenceType, table.referenceId),
        postedAtIdx: index("financial_journals_posted_at_idx").on(table.postedAt),
    };
});

// ─── Journal Entries (Balanced Debits and Credits) ───
export const journalEntries = pgTable("journal_entries", {
    id: varchar("id", { length: 255 }).primaryKey(),
    journalId: varchar("journal_id", { length: 255 }).notNull().references(() => financialJournals.id),
    accountCode: varchar("account_code", { length: 100 }).notNull(), // e.g. 1100_ACCOUNTS_RECEIVABLE
    accountName: varchar("account_name", { length: 255 }).notNull(),
    debit: real("debit").notNull().default(0),
    credit: real("credit").notNull().default(0),
    memo: varchar("memo", { length: 500 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => {
    return {
        journalIdIdx: index("journal_entries_journal_id_idx").on(table.journalId),
        accountCodeIdx: index("journal_entries_account_code_idx").on(table.accountCode),
    };
});

// ─── Document Sequences (Concurrency-Safe Counter Table) ───
export const documentSequences = pgTable("document_sequences", {
    documentType: varchar("document_type", { length: 50 }).notNull(),
    year: integer("year").notNull(),
    currentValue: integer("current_value").notNull().default(0),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
    return {
        pk: primaryKey({ columns: [table.documentType, table.year] }),
    };
});

// ─── Payment Allocations (One-to-Many & Many-to-One Invoice Allocation) ───
export const paymentAllocations = pgTable("payment_allocations", {
    id: varchar("id", { length: 255 }).primaryKey(),
    paymentId: varchar("payment_id", { length: 255 }).notNull().references(() => clientPayments.id),
    invoiceId: varchar("invoice_id", { length: 255 }).notNull().references(() => invoices.id),
    amount: real("amount").notNull(),
    status: varchar("status", { length: 50 }).notNull().default("active"), // active | reversed
    allocatedAt: timestamp("allocated_at").notNull().defaultNow(),
    allocatedBy: varchar("allocated_by", { length: 255 }).references(() => users.id),
    notes: varchar("notes", { length: 1000 }),
    reversedAt: timestamp("reversed_at"),
    reversedBy: varchar("reversed_by", { length: 255 }).references(() => users.id),
}, (table) => {
    return {
        paymentIdIdx: index("payment_allocations_payment_id_idx").on(table.paymentId),
        invoiceIdIdx: index("payment_allocations_invoice_id_idx").on(table.invoiceId),
        statusIdx: index("payment_allocations_status_idx").on(table.status),
    };
});

// ─── Vendor Payouts (E3-to-Vendor Disbursement) ───
export const vendorPayouts = pgTable("vendor_payouts", {
    id: varchar("id", { length: 255 }).primaryKey(),
    payoutNumber: varchar("payout_number", { length: 100 }).notNull().unique(), // e.g. PO-2026-0001
    vendorId: varchar("vendor_id", { length: 255 }).notNull().references(() => vendors.id),
    ledgerId: varchar("ledger_id", { length: 255 }).references(() => vendorLedgers.id),
    amount: real("amount").notNull(),
    currency: varchar("currency", { length: 10 }).notNull().default("QAR"),
    payoutMethod: varchar("payout_method", { length: 50 }).notNull().default("bank_transfer"),
    transactionRef: varchar("transaction_ref", { length: 255 }),
    payoutProofUrl: varchar("payout_proof_url", { length: 500 }),
    status: varchar("status", { length: 50 }).notNull().default("approved_paid"), // pending | approved_paid | failed
    processedBy: varchar("processed_by", { length: 255 }).references(() => users.id),
    processedAt: timestamp("processed_at").notNull().defaultNow(),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
    return {
        payoutNumberIdx: index("vendor_payouts_payout_number_idx").on(table.payoutNumber),
        vendorIdIdx: index("vendor_payouts_vendor_id_idx").on(table.vendorId),
        ledgerIdIdx: index("vendor_payouts_ledger_id_idx").on(table.ledgerId),
    };
});

// ─── Vendor Remittances (Vendor-to-E3 Collection Remittance) ───
export const vendorRemittances = pgTable("vendor_remittances", {
    id: varchar("id", { length: 255 }).primaryKey(),
    remittanceNumber: varchar("remittance_number", { length: 100 }).notNull().unique(), // e.g. REM-2026-0001
    vendorId: varchar("vendor_id", { length: 255 }).notNull().references(() => vendors.id),
    bookingId: varchar("booking_id", { length: 255 }).references(() => bookings.id),
    amountCollected: real("amount_collected").notNull(),
    platformCommissionOwed: real("platform_commission_owed").notNull(),
    remittanceEvidenceUrl: varchar("remittance_evidence_url", { length: 500 }),
    status: varchar("status", { length: 50 }).notNull().default("pending"), // pending | submitted_for_review | approved_verified | rejected
    verifiedBy: varchar("verified_by", { length: 255 }).references(() => users.id),
    verifiedAt: timestamp("verified_at"),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
    return {
        remittanceNumberIdx: index("vendor_remittances_remittance_number_idx").on(table.remittanceNumber),
        vendorIdIdx: index("vendor_remittances_vendor_id_idx").on(table.vendorId),
        bookingIdIdx: index("vendor_remittances_booking_id_idx").on(table.bookingId),
        statusIdx: index("vendor_remittances_status_idx").on(table.status),
    };
});

// ─── Financial Relations ───
export const invoicesRelations = relations(invoices, ({ one, many }) => ({
    booking: one(bookings, {
        fields: [invoices.bookingId],
        references: [bookings.id],
    }),
    user: one(users, {
        fields: [invoices.userId],
        references: [users.id],
    }),
    items: many(invoiceItems),
    payments: many(clientPayments),
    allocations: many(paymentAllocations),
    creditNotes: many(creditNotes),
}));

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
    invoice: one(invoices, {
        fields: [invoiceItems.invoiceId],
        references: [invoices.id],
    }),
    booking: one(bookings, {
        fields: [invoiceItems.bookingId],
        references: [bookings.id],
    }),
    product: one(products, {
        fields: [invoiceItems.productId],
        references: [products.id],
    }),
}));

export const clientPaymentsRelations = relations(clientPayments, ({ one, many }) => ({
    invoice: one(invoices, {
        fields: [clientPayments.invoiceId],
        references: [invoices.id],
    }),
    booking: one(bookings, {
        fields: [clientPayments.bookingId],
        references: [bookings.id],
    }),
    user: one(users, {
        fields: [clientPayments.userId],
        references: [users.id],
    }),
    verifier: one(users, {
        fields: [clientPayments.verifiedBy],
        references: [users.id],
    }),
    allocations: many(paymentAllocations),
    refunds: many(refunds),
}));

export const paymentAllocationsRelations = relations(paymentAllocations, ({ one }) => ({
    payment: one(clientPayments, {
        fields: [paymentAllocations.paymentId],
        references: [clientPayments.id],
    }),
    invoice: one(invoices, {
        fields: [paymentAllocations.invoiceId],
        references: [invoices.id],
    }),
    allocator: one(users, {
        fields: [paymentAllocations.allocatedBy],
        references: [users.id],
    }),
}));

export const creditNotesRelations = relations(creditNotes, ({ one, many }) => ({
    invoice: one(invoices, {
        fields: [creditNotes.invoiceId],
        references: [invoices.id],
    }),
    booking: one(bookings, {
        fields: [creditNotes.bookingId],
        references: [bookings.id],
    }),
    user: one(users, {
        fields: [creditNotes.userId],
        references: [users.id],
    }),
    issuer: one(users, {
        fields: [creditNotes.issuedBy],
        references: [users.id],
    }),
    refunds: many(refunds),
}));

export const refundsRelations = relations(refunds, ({ one }) => ({
    creditNote: one(creditNotes, {
        fields: [refunds.creditNoteId],
        references: [creditNotes.id],
    }),
    payment: one(clientPayments, {
        fields: [refunds.paymentId],
        references: [clientPayments.id],
    }),
    user: one(users, {
        fields: [refunds.userId],
        references: [users.id],
    }),
    processor: one(users, {
        fields: [refunds.processedBy],
        references: [users.id],
    }),
}));

export const vendorPayoutsRelations = relations(vendorPayouts, ({ one }) => ({
    vendor: one(vendors, {
        fields: [vendorPayouts.vendorId],
        references: [vendors.id],
    }),
    ledger: one(vendorLedgers, {
        fields: [vendorPayouts.ledgerId],
        references: [vendorLedgers.id],
    }),
    processor: one(users, {
        fields: [vendorPayouts.processedBy],
        references: [users.id],
    }),
}));

export const vendorRemittancesRelations = relations(vendorRemittances, ({ one }) => ({
    vendor: one(vendors, {
        fields: [vendorRemittances.vendorId],
        references: [vendors.id],
    }),
    booking: one(bookings, {
        fields: [vendorRemittances.bookingId],
        references: [bookings.id],
    }),
    verifier: one(users, {
        fields: [vendorRemittances.verifiedBy],
        references: [users.id],
    }),
}));

export const financialJournalsRelations = relations(financialJournals, ({ many }) => ({
    entries: many(journalEntries),
}));

export const journalEntriesRelations = relations(journalEntries, ({ one }) => ({
    journal: one(financialJournals, {
        fields: [journalEntries.journalId],
        references: [financialJournals.id],
    }),
}));

// ─── Append-Only Audit Logs ───
export const auditLogs = pgTable("audit_logs", {
    id: varchar("id", { length: 255 }).primaryKey(),
    actorId: varchar("actor_id", { length: 255 }).references(() => users.id),
    actorEmail: varchar("actor_email", { length: 255 }),
    actorRole: varchar("actor_role", { length: 50 }),
    tenantId: varchar("tenant_id", { length: 255 }),
    action: varchar("action", { length: 100 }).notNull(),
    objectType: varchar("object_type", { length: 100 }).notNull(),
    objectId: varchar("object_id", { length: 255 }),
    beforeState: jsonb("before_state"),
    afterState: jsonb("after_state"),
    reason: varchar("reason", { length: 1000 }),
    correlationId: varchar("correlation_id", { length: 255 }).notNull(),
    ipAddress: varchar("ip_address", { length: 50 }),
    userAgent: varchar("user_agent", { length: 500 }),
    severity: varchar("severity", { length: 50 }).notNull().default("info"), // info | warning | critical
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => {
    return {
        actorIdIdx: index("audit_logs_actor_id_idx").on(table.actorId),
        actionIdx: index("audit_logs_action_idx").on(table.action),
        objectIdx: index("audit_logs_object_idx").on(table.objectType, table.objectId),
        correlationIdIdx: index("audit_logs_correlation_id_idx").on(table.correlationId),
        createdAtIdx: index("audit_logs_created_at_idx").on(table.createdAt),
        tenantIdIdx: index("audit_logs_tenant_id_idx").on(table.tenantId),
    };
});

// ─── Compliance Rules ───
export const complianceRules = pgTable("compliance_rules", {
    id: varchar("id", { length: 255 }).primaryKey(),
    ruleCode: varchar("rule_code", { length: 100 }).notNull().unique(),
    ruleType: varchar("rule_type", { length: 100 }).notNull(), // category_certificate | inspection_interval | vendor_kyc_prerequisite | expiry_window
    name: varchar("name", { length: 255 }).notNull(),
    description: varchar("description", { length: 1000 }),
    targetType: varchar("target_type", { length: 50 }).notNull(), // product | category | asset | vendor
    targetId: varchar("target_id", { length: 255 }),
    parameters: jsonb("parameters").notNull(),
    isMandatory: boolean("is_mandatory").notNull().default(true),
    isActive: boolean("is_active").notNull().default(true),
    version: integer("version").notNull().default(1),
    effectiveDate: timestamp("effective_date").notNull().defaultNow(),
    createdBy: varchar("created_by", { length: 255 }).references(() => users.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
    return {
        ruleCodeIdx: index("compliance_rules_rule_code_idx").on(table.ruleCode),
        ruleTypeIdx: index("compliance_rules_rule_type_idx").on(table.ruleType),
        targetIdx: index("compliance_rules_target_idx").on(table.targetType, table.targetId),
        isActiveIdx: index("compliance_rules_is_active_idx").on(table.isActive),
    };
});

// ─── Notification Outbox ───
export const notificationOutbox = pgTable("notification_outbox", {
    id: varchar("id", { length: 255 }).primaryKey(),
    eventType: varchar("event_type", { length: 100 }).notNull(),
    recipientId: varchar("recipient_id", { length: 255 }).references(() => users.id),
    recipientEmail: varchar("recipient_email", { length: 255 }),
    recipientPhone: varchar("recipient_phone", { length: 100 }),
    channel: varchar("channel", { length: 50 }).notNull().default("in_app"), // in_app | email | whatsapp
    templateName: varchar("template_name", { length: 100 }),
    payload: jsonb("payload").notNull(),
    status: varchar("status", { length: 50 }).notNull().default("pending"), // pending | suppressed | sent_to_provider | confirmed_delivered | failed | retrying | cancelled
    providerResponse: jsonb("provider_response"),
    retryCount: integer("retry_count").notNull().default(0),
    lastError: varchar("last_error", { length: 1000 }),
    correlationId: varchar("correlation_id", { length: 255 }),
    scheduledFor: timestamp("scheduled_for").notNull().defaultNow(),
    sentAt: timestamp("sent_at"),
    deliveredAt: timestamp("delivered_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
    return {
        recipientIdIdx: index("notification_outbox_recipient_id_idx").on(table.recipientId),
        statusIdx: index("notification_outbox_status_idx").on(table.status),
        eventTypeIdx: index("notification_outbox_event_type_idx").on(table.eventType),
        createdAtIdx: index("notification_outbox_created_at_idx").on(table.createdAt),
        correlationIdIdx: index("notification_outbox_correlation_id_idx").on(table.correlationId),
    };
});

// ─── Cron Job Execution & Concurrency Governance ───
export const cronJobRuns = pgTable("cron_job_runs", {
    id: varchar("id", { length: 255 }).primaryKey(),
    jobName: varchar("job_name", { length: 100 }).notNull(),
    triggerType: varchar("trigger_type", { length: 50 }).notNull().default("scheduled"), // scheduled | manual
    status: varchar("status", { length: 50 }).notNull().default("running"), // running | success | failed | locked
    startTime: timestamp("start_time").notNull().defaultNow(),
    endTime: timestamp("end_time"),
    durationMs: integer("duration_ms"),
    itemsProcessed: integer("items_processed").notNull().default(0),
    itemsFailed: integer("items_failed").notNull().default(0),
    errorDetails: jsonb("error_details"),
    lockedBy: varchar("locked_by", { length: 255 }),
    lockExpiresAt: timestamp("lock_expires_at"),
    triggeredBy: varchar("triggered_by", { length: 255 }).references(() => users.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => {
    return {
        jobNameIdx: index("cron_job_runs_job_name_idx").on(table.jobName),
        statusIdx: index("cron_job_runs_status_idx").on(table.status),
        startTimeIdx: index("cron_job_runs_start_time_idx").on(table.startTime),
    };
});

// ─── User Active Sessions & Revocation ───
export const userSessions = pgTable("user_sessions", {
    id: varchar("id", { length: 255 }).primaryKey(),
    userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
    sessionTokenHash: varchar("session_token_hash", { length: 255 }).notNull().unique(),
    deviceInfo: varchar("device_info", { length: 500 }),
    ipAddress: varchar("ip_address", { length: 50 }),
    isRevoked: boolean("is_revoked").notNull().default(false),
    revokedAt: timestamp("revoked_at"),
    lastActiveAt: timestamp("last_active_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    expiresAt: timestamp("expires_at").notNull(),
}, (table) => {
    return {
        userIdIdx: index("user_sessions_user_id_idx").on(table.userId),
        tokenHashIdx: index("user_sessions_token_hash_idx").on(table.sessionTokenHash),
        isRevokedIdx: index("user_sessions_is_revoked_idx").on(table.isRevoked),
    };
});

// ─── Governance Relations ───
export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
    actor: one(users, {
        fields: [auditLogs.actorId],
        references: [users.id],
    }),
}));

export const complianceRulesRelations = relations(complianceRules, ({ one }) => ({
    creator: one(users, {
        fields: [complianceRules.createdBy],
        references: [users.id],
    }),
}));

export const notificationOutboxRelations = relations(notificationOutbox, ({ one }) => ({
    recipient: one(users, {
        fields: [notificationOutbox.recipientId],
        references: [users.id],
    }),
}));

export const cronJobRunsRelations = relations(cronJobRuns, ({ one }) => ({
    user: one(users, {
        fields: [cronJobRuns.triggeredBy],
        references: [users.id],
    }),
}));

export const userSessionsRelations = relations(userSessions, ({ one }) => ({
    user: one(users, {
        fields: [userSessions.userId],
        references: [users.id],
    }),
}));





// ─── Authentication & Verification Tokens ───
export const authTokens = pgTable("auth_tokens", {
    id: varchar("id", { length: 255 }).primaryKey(),
    userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
    type: varchar("type", { length: 50 }).notNull(), // password_reset | email_verification | vendor_invitation
    tokenHash: varchar("token_hash", { length: 255 }).notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    usedAt: timestamp("used_at"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => {
    return {
        userIdIdx: index("auth_tokens_user_id_idx").on(table.userId),
        tokenHashIdx: index("auth_tokens_token_hash_idx").on(table.tokenHash),
        typeIdx: index("auth_tokens_type_idx").on(table.type),
    };
});

// ─── Processed Webhooks & Replay Protection ───
export const processedWebhooks = pgTable("processed_webhooks", {
    id: varchar("id", { length: 255 }).primaryKey(),
    webhookId: varchar("webhook_id", { length: 255 }).notNull().unique(),
    provider: varchar("provider", { length: 50 }).notNull(), // stripe | sadad | dev_mock
    eventType: varchar("event_type", { length: 100 }).notNull(),
    status: varchar("status", { length: 50 }).notNull().default("processed"),
    payloadHash: varchar("payload_hash", { length: 255 }),
    metadata: jsonb("metadata"),
    processedAt: timestamp("processed_at").notNull().defaultNow(),
}, (table) => {
    return {
        webhookIdIdx: index("processed_webhooks_webhook_id_idx").on(table.webhookId),
        providerIdx: index("processed_webhooks_provider_idx").on(table.provider),
    };
});

// ─── Distributed PostgreSQL Rate Limiter ───
export const rateLimitEntries = pgTable("rate_limit_entries", {
    id: varchar("id", { length: 255 }).primaryKey(),
    key: varchar("key", { length: 255 }).notNull(),
    points: integer("points").notNull().default(1),
    expireAt: timestamp("expire_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => {
    return {
        keyIdx: index("rate_limit_entries_key_idx").on(table.key),
        expireAtIdx: index("rate_limit_entries_expire_at_idx").on(table.expireAt),
    };
});

export const authTokensRelations = relations(authTokens, ({ one }) => ({
    user: one(users, {
        fields: [authTokens.userId],
        references: [users.id],
    }),
}));

export const proofOfDeliveriesRelations = relations(proofOfDeliveries, ({ one }) => ({
    booking: one(bookings, {
        fields: [proofOfDeliveries.bookingId],
        references: [bookings.id],
    }),
    dispatchLog: one(bookingDispatchLogs, {
        fields: [proofOfDeliveries.dispatchLogId],
        references: [bookingDispatchLogs.id],
    }),
    driver: one(users, {
        fields: [proofOfDeliveries.driverId],
        references: [users.id],
    }),
}));

export const rentalAgreementsRelations = relations(rentalAgreements, ({ one }) => ({
    booking: one(bookings, {
        fields: [rentalAgreements.bookingId],
        references: [bookings.id],
    }),
    client: one(users, {
        fields: [rentalAgreements.clientId],
        references: [users.id],
    }),
}));

export const sparePartsRelations = relations(spareParts, ({ one, many }) => ({
    vendor: one(vendors, {
        fields: [spareParts.vendorId],
        references: [vendors.id],
    }),
    warehouse: one(vendorWarehouses, {
        fields: [spareParts.warehouseId],
        references: [vendorWarehouses.id],
    }),
    usages: many(maintenancePartsUsage),
}));

export const maintenanceWorkOrdersRelations = relations(maintenanceWorkOrders, ({ one, many }) => ({
    unit: one(inventoryUnits, {
        fields: [maintenanceWorkOrders.unitId],
        references: [inventoryUnits.id],
    }),
    maintenanceRecord: one(maintenanceRecords, {
        fields: [maintenanceWorkOrders.maintenanceRecordId],
        references: [maintenanceRecords.id],
    }),
    assignedTechnician: one(users, {
        fields: [maintenanceWorkOrders.assignedTechnicianId],
        references: [users.id],
    }),
    partsUsed: many(maintenancePartsUsage),
}));

export const maintenancePartsUsageRelations = relations(maintenancePartsUsage, ({ one }) => ({
    workOrder: one(maintenanceWorkOrders, {
        fields: [maintenancePartsUsage.workOrderId],
        references: [maintenanceWorkOrders.id],
    }),
    sparePart: one(spareParts, {
        fields: [maintenancePartsUsage.sparePartId],
        references: [spareParts.id],
    }),
}));

export const vendorSettlementStatementsRelations = relations(vendorSettlementStatements, ({ one, many }) => ({
    vendor: one(vendors, {
        fields: [vendorSettlementStatements.vendorId],
        references: [vendors.id],
    }),
    items: many(settlementStatementItems),
}));

export const settlementStatementItemsRelations = relations(settlementStatementItems, ({ one }) => ({
    statement: one(vendorSettlementStatements, {
        fields: [settlementStatementItems.statementId],
        references: [vendorSettlementStatements.id],
    }),
    booking: one(bookings, {
        fields: [settlementStatementItems.bookingId],
        references: [bookings.id],
    }),
}));

export const bookingExtensionsRelations = relations(bookingExtensions, ({ one }) => ({
    booking: one(bookings, {
        fields: [bookingExtensions.bookingId],
        references: [bookings.id],
    }),
    approver: one(users, {
        fields: [bookingExtensions.approvedBy],
        references: [users.id],
    }),
}));

export const productKitItemsRelations = relations(productKitItems, ({ one }) => ({
    parentProduct: one(products, {
        fields: [productKitItems.parentProductId],
        references: [products.id],
        relationName: "kitParent",
    }),
    childProduct: one(products, {
        fields: [productKitItems.childProductId],
        references: [products.id],
        relationName: "kitChild",
    }),
}));

export const damageClaimsRelations = relations(damageClaims, ({ one }) => ({
    booking: one(bookings, {
        fields: [damageClaims.bookingId],
        references: [bookings.id],
    }),
    unit: one(inventoryUnits, {
        fields: [damageClaims.inventoryUnitId],
        references: [inventoryUnits.id],
    }),
    inspectionLog: one(inspectionLogs, {
        fields: [damageClaims.inspectionLogId],
        references: [inspectionLogs.id],
    }),
    filer: one(users, {
        fields: [damageClaims.filedBy],
        references: [users.id],
    }),
}));

export const crossHireOrdersRelations = relations(crossHireOrders, ({ one }) => ({
    booking: one(bookings, {
        fields: [crossHireOrders.bookingId],
        references: [bookings.id],
    }),
    supplierVendor: one(vendors, {
        fields: [crossHireOrders.supplierVendorId],
        references: [vendors.id],
    }),
    product: one(products, {
        fields: [crossHireOrders.productId],
        references: [products.id],
    }),
    creator: one(users, {
        fields: [crossHireOrders.createdById],
        references: [users.id],
    }),
}));

export const fleetGpsPingsRelations = relations(fleetGpsPings, ({ one }) => ({
    dispatchLog: one(bookingDispatchLogs, {
        fields: [fleetGpsPings.dispatchLogId],
        references: [bookingDispatchLogs.id],
    }),
    driver: one(users, {
        fields: [fleetGpsPings.driverId],
        references: [users.id],
    }),
}));

export const clientOrganizationsRelations = relations(clientOrganizations, ({ many }) => ({
    members: many(organizationMembers),
    costCenters: many(organizationCostCenters),
    approvalRequests: many(bookingApprovalRequests),
    bookings: many(bookings),
}));

export const organizationMembersRelations = relations(organizationMembers, ({ one }) => ({
    organization: one(clientOrganizations, {
        fields: [organizationMembers.organizationId],
        references: [clientOrganizations.id],
    }),
    user: one(users, {
        fields: [organizationMembers.userId],
        references: [users.id],
    }),
}));

export const organizationCostCentersRelations = relations(organizationCostCenters, ({ one, many }) => ({
    organization: one(clientOrganizations, {
        fields: [organizationCostCenters.organizationId],
        references: [clientOrganizations.id],
    }),
    bookings: many(bookings),
}));

export const bookingApprovalRequestsRelations = relations(bookingApprovalRequests, ({ one }) => ({
    booking: one(bookings, {
        fields: [bookingApprovalRequests.bookingId],
        references: [bookings.id],
    }),
    organization: one(clientOrganizations, {
        fields: [bookingApprovalRequests.organizationId],
        references: [clientOrganizations.id],
    }),
    costCenter: one(organizationCostCenters, {
        fields: [bookingApprovalRequests.costCenterId],
        references: [organizationCostCenters.id],
    }),
    requestedBy: one(users, {
        fields: [bookingApprovalRequests.requestedById],
        references: [users.id],
    }),
    approver: one(users, {
        fields: [bookingApprovalRequests.approverId],
        references: [users.id],
    }),
}));

