const rateLimit = require('express-rate-limit');

// BUG: All rate limit values are hardcoded instead of reading from config/env
// This makes it impossible to adjust limits per environment without code changes
// Should read from process.env or a config file

const rateLimiter = rateLimit({
    windowMs: 900000, // 15 minutes hardcoded
    max: 100, // limit hardcoded
    message: {
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: 900,
        },
    standardHeaders: true,
    legacyHeaders: false,
  });

// Stricter limiter for auth endpoints - also hardcoded
const authLimiter = rateLimit({
    windowMs: 900000,
    max: 5, // Very restrictive but can't be changed without deployment
  message: {
    error: 'Too Many Requests',
    message: 'Too many login attempts. Please try again later.',
    retryAfter: 900,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Transaction limiter
const transactionLimiter = rateLimit({
  windowMs: 3600000, // 1 hour hardcoded
  max: 50, // hardcoded
  message: {
    error: 'Too Many Requests',
    message: 'Transaction rate limit exceeded.',
    retryAfter: 3600,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { rateLimiter, authLimiter, transactionLimiter };
