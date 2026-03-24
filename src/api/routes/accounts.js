const express = require('express');
const router = express.Router();
const accountService = require('../../services/accountService');
const { authorize } = require('../middleware/auth');

/**
 * GET /api/v1/accounts
 * Get all accounts for the authenticated user
 */
router.get('/', async (req, res, next) => {
    try {
          const accounts = await accountService.getUserAccounts(req.userId);
          res.json({ data: accounts, count: accounts.length });
        } catch (error) {
          next(error);
        }
  });

/**
 * GET /api/v1/accounts/:id
 * Get a specific account by ID
 * BUG: No null/undefined check on req.params.id
 * Passing null, undefined, or empty string causes an unhandled 500 error
 */
router.get('/:id', async (req, res, next) => {
    try {
          // BUG: Missing validation for req.params.id
          // If id is 'null', 'undefined', or empty, this throws a CastError
          // that produces a confusing error message instead of a clean 400
          const account = await accountService.getAccount(req.params.id);

          // BUG: No ownership check - any authenticated user can view any account
          res.json({ data: account });
        } catch (error) {
          next(error);
        }
  });

/**
 * POST /api/v1/accounts
 * Create a new account
 */
router.post('/', async (req, res, next) => {
    try {
          const { type, currency, branch } = req.body;

          if (!type) {
                  return res.status(400).json({
                            error: 'Validation Error',
                            message: 'Account type is required',
                          });
                }

          const account = await accountService.createAccount(req.userId, {
                  type,
                  currency,
                  branch,
                });

          res.status(201).json({ data: account });
        } catch (error) {
          next(error);
        }
  });

/**
 * PUT /api/v1/accounts/:id/freeze
 * Freeze an account (admin only)
 */
router.put('/:id/freeze', authorize('admin', 'compliance_officer'), async (req, res, next) => {
    try {
          const account = await accountService.freezeAccount(req.params.id, req.body.reason);
          res.json({ data: account, message: 'Account frozen successfully' });
        } catch (error) {
          next(error);
        }
  });

/**
 * PUT /api/v1/accounts/:id/close
 * Close an account
 */
router.put('/:id/close', async (req, res, next) => {
    try {
          const account = await accountService.closeAccount(req.params.id);
          res.json({ data: account, message: 'Account closed successfully' });
        } catch (error) {
          next(error);
        }
  });

module.exports = router;
