/**
 * Centralized User Roles across the E3 Rentals Ecosystem
 */
export const USER_ROLES = {
    SUPER_ADMIN: "super_admin",
    ADMIN: "admin",
    VENDOR: "vendor",
    CLIENT: "client",
    SALES_REP: "sales_rep",
    WAREHOUSE_MANAGER: "warehouse_manager",
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

/**
 * Booking & Quote Operational Statuses
 */
export const BOOKING_STATUS = {
    REQUEST: "request",
    PENDING_QUOTE: "pending_quote",
    QUOTE_SENT: "quote_sent",
    CHANGES_REQUESTED: "changes_requested",
    QUOTE_ACCEPTED: "quote_accepted",
    APPROVED: "approved",
    BOOKED: "booked",
    BOOKING_REQUESTED: "booking_requested",
    CANCELLED: "cancelled",
    UNDELIVERED: "undelivered",
    COMPLETED: "completed",
} as const;

export type BookingStatus = typeof BOOKING_STATUS[keyof typeof BOOKING_STATUS];

/**
 * KYC Compliance Statuses
 */
export const KYC_STATUS = {
    PENDING: "pending",
    IN_REVIEW: "in_review",
    APPROVED: "approved",
    REJECTED: "rejected",
} as const;

export type KYCStatus = typeof KYC_STATUS[keyof typeof KYC_STATUS];

/**
 * Commission Types
 */
export const COMMISSION_TYPE = {
    PERCENTAGE: "percentage",
    FIXED_PER_ITEM: "fixed_per_item",
    PER_PROJECT_FEE: "per_project_fee",
    FIXED_MONTHLY: "fixed_monthly",
} as const;

export type CommissionType = typeof COMMISSION_TYPE[keyof typeof COMMISSION_TYPE];

/**
 * Booking Unit Assignment Statuses
 */
export const ASSIGNMENT_STATUS = {
    RESERVED: "reserved",
    DISPATCHED: "dispatched",
    RETURNED: "returned",
} as const;

export type AssignmentStatus = typeof ASSIGNMENT_STATUS[keyof typeof ASSIGNMENT_STATUS];

/**
 * Product Lifecycle Statuses
 */
export const PRODUCT_STATUS = {
    DRAFT: "draft",
    PENDING_REVIEW: "pending_review",
    CHANGES_REQUESTED: "changes_requested",
    APPROVED: "approved",
    PUBLISHED: "published",
    UNPUBLISHED: "unpublished",
    ARCHIVED: "archived",
} as const;

export type ProductStatus = typeof PRODUCT_STATUS[keyof typeof PRODUCT_STATUS];

/**
 * Authoritative Serialized Asset Unit Statuses
 */
export const ASSET_STATUS = {
    ONBOARDING: "onboarding",
    IN_WAREHOUSE: "in_warehouse",
    RESERVED: "reserved",
    ALLOCATED: "allocated",
    PICKING: "picking",
    STAGED: "staged",
    PACKED: "packed",
    LOADED: "loaded",
    DISPATCHED: "dispatched",
    ON_RENT: "on_rent",
    RETURN_DUE: "return_due",
    RETURNED: "returned",
    AWAITING_INSPECTION: "awaiting_inspection",
    IN_MAINTENANCE: "in_maintenance",
    DAMAGED_HOLD: "damaged_hold",
    MISSING_LOST: "missing_lost",
    RETIRED: "retired",
} as const;

export type AssetStatus = typeof ASSET_STATUS[keyof typeof ASSET_STATUS];

/**
 * Maintenance Ticket Statuses
 */
export const MAINTENANCE_STATUS = {
    OPEN: "open",
    IN_PROGRESS: "in_progress",
    AWAITING_PARTS: "awaiting_parts",
    COMPLETED: "completed",
    CANCELLED: "cancelled",
} as const;

export type MaintenanceStatus = typeof MAINTENANCE_STATUS[keyof typeof MAINTENANCE_STATUS];


