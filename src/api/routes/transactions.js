const express = require('express');
const router = express.Router();
const transactionService = require('../../services/transactionService');
const complianceService = require('../../services/complianceService');
const { authorize } = require('../middleware/auth');
const { transactionLimiter } = require('../middleware/rateLimit');

router.get('/:accountId', async (req, res, next) => {
    try {
          const transactions = await transactionService.getAccountTransactions(req.params.accountId);
          res.json({ data: transactions, count: transactions.length });
        } catch (error) {
          next(error);
        }
  });

router.get('/detail/:transactionId', async (req, res, next) => {
    try {
          const transaction = await transactionService.getTransaction(req.params.transactionId);
          res.json({ data: transaction });
        } catch (error) {
          next(error);
        }
  });

router.post('/', transactionLimiter, async (req, res, next) => {
    try {
          const { fromAccount, toAccount, amount, type, currency, description } = req.body;
          if (!fromAccount || !amount || !type) {
                  return res.status(400).json({ error: 'Validation Error', message: 'fromAccount, amount, and type are required' });
                }
          if (amount <= 0) {
                  return res.status(400).json({ error: 'Validation Error', message: 'Amount must be positive' });
                }
          const transaction = await transactionService.createTransaction({
                  fromAccount, toAccount, amount, type, currency, description,
                  ip: req.ip, userAgent: req.headers['user-agent'],
                });
          complianceService.screenTransaction(transaction).catch(() => {});
          res.status(201).json({ data: transaction });
        } catch (error) {
          next(error);
        }
  });

router.post('/:transactionId/reverse', authorize('admin'), async (req, res, next) => {
    try {
          const { reason } = req.body;
          if (!reason) {
                  return res.status(400).json({ error: 'Validation Error', message: 'Reason is required for reversal' });
                }
          const transaction = await transactionService.reverseTransaction(req.params.transactionId, reason);
          res.json({ data: transaction, message: 'Transaction reversed' });
        } catch (error) {
          next(error);
        }
  });

router.get('/summary/:accountId', async (req, res, next) => {
    try {
          const { startDate, endDate } = req.query;
          const summary = await transactionService.getTransactionSummary(
                  req.params.accountId, new Date(startDate), new Date(endDate)
                );
          res.json({ data: summary });
        } catch (error) {
          next(error);
        }
  });

module.exports = router;
