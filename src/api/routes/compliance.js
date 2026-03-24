const express = require('express');
const router = express.Router();
const complianceService = require('../../services/complianceService');
const { authorize } = require('../middleware/auth');

router.get('/report/daily', authorize('admin', 'compliance_officer'), async (req, res, next) => {
    try {
      const date = req.query.date ? new Date(req.query.date) : new Date();
    const report = await complianceService.generateDailyReport(date);
    res.json({ data: report });
} catch (error) {
    next(error);
}
});

router.get('/kyc/:userId', authorize('admin', 'compliance_officer'), async (req, res, next) => {
  try {
    const status = await complianceService.checkKYCStatus(req.params.userId);
    res.json({ data: status });
} catch (error) {
    next(error);
}
});

router.post('/screen/:transactionId', authorize('admin', 'compliance_officer'), async (req, res, next) => {
  try {
    const Transaction = require('../../models/Transaction');
    const transaction = await Transaction.findOne({ transactionId: req.params.transactionId });
    if (!transaction) {
      return res.status(404).json({ error: 'Not Found', message: 'Transaction not found' });
}
    const result = await complianceService.screenTransaction(transaction);
    res.json({ data: result });
} catch (error) {
    next(error);
}
});

module.exports = router;
