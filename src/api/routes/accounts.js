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
 */
router.get('/:id', async (req, res, next) => {
    try {
          const account = await accountService.getAccount(req.params.id);

          // Ownership check: only the account owner (or admin/compliance) may view
          const ownerId = account.owner._id ? account.owner._id.toString() : account.owner.toString();
          const isOwner = ownerId === req.userId.toString();
          const isPrivileged = req.user && ['admin', 'compliance_officer'].includes(req.user.role);

          if (!isOwner && !isPrivileged) {
                return res.status(403).json({
                      error: 'Forbidden',
                      message: 'You do not have permission to view this account',
                });
          }

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
