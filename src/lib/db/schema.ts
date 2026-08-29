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
    shelfLocation: varchar("shelf_location", { length: 255 }), // e.g. "Rack A3 / Shelf 2"
    purchaseDate: timestamp("purchase_date"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
    return {
        productIdIdx: index("inventory_units_product_id_idx").on(table.productId),
        vendorIdIdx: index("inventory_units_vendor_id_idx").on(table.vendorId),
        assetTagIdx: index("inventory_units_tag_idx").on(table.assetTagCode),
        statusIdx: index("inventory_units_status_idx").on(table.availabilityStatus),
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
}, (table) => {
    return {
        productIdIdx: index("bookings_product_id_idx").on(table.productId),
        statusIdx: index("bookings_status_idx").on(table.status),
        startDateIdx: index("bookings_start_date_idx").on(table.startDate),
        endDateIdx: index("bookings_end_date_idx").on(table.endDate),
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
    inspectionLogs: many(inspectionLogs),
    maintenanceRecords: many(maintenanceRecords),
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
