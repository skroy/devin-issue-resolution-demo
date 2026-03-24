/**
 * Application constants
 * 
 * TECH DEBT: Several of these are stale/deprecated and should be cleaned up.
 * Feature flags that shipped months ago are still here as constants.
 */

// Account types
const ACCOUNT_TYPES = ['checking', 'savings', 'investment', 'credit'];

// Transaction types
const TRANSACTION_TYPES = ['deposit', 'withdrawal', 'transfer', 'payment', 'fee', 'refund'];

// Transaction statuses
const TRANSACTION_STATUSES = ['pending', 'completed', 'failed', 'reversed', 'flagged'];

// Account statuses  
const ACCOUNT_STATUSES = ['active', 'frozen', 'closed', 'pending_review'];

// User roles
const USER_ROLES = ['customer', 'advisor', 'admin', 'compliance_officer'];

// DEPRECATED: Old status codes from v1 API - should have been removed in v2 migration
// These are still referenced in some error handlers
const LEGACY_STATUS_CODES = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    RATE_LIMITED: 429,
    SERVER_ERROR: 500,
    // These custom codes were a bad idea and should never have existed
    ACCOUNT_FROZEN: 460,
    KYC_REQUIRED: 461,
    COMPLIANCE_HOLD: 462,
};

// STALE: Feature flags that already shipped and should be removed
// These are checked at runtime but always return true now
const FEATURE_FLAGS = {
    ENABLE_NEW_DASHBOARD: true,        // Shipped in v2.1 (3 months ago)
    ENABLE_MULTI_CURRENCY: true,       // Shipped in v2.2 (2 months ago)
    ENABLE_COMPLIANCE_V2: true,        // Shipped in v2.3 (6 weeks ago)
    ENABLE_BATCH_TRANSACTIONS: false,  // Not yet implemented
    USE_NEW_AUTH_FLOW: true,           // Shipped in v2.0 (4 months ago)
    ENABLE_WEBHOOKS: false,            // In development
};

// Currencies supported
const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY'];

// Pagination defaults
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

module.exports = {
    ACCOUNT_TYPES,
    TRANSACTION_TYPES,
    TRANSACTION_STATUSES,
    ACCOUNT_STATUSES,
    USER_ROLES,
    LEGACY_STATUS_CODES,
    FEATURE_FLAGS,
    CURRENCIES,
    DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE,
};
