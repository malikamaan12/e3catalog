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
