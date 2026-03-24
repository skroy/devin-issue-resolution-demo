const Transaction = require('../models/Transaction');
const Account = require('../models/Account');
const notificationService = require('./notificationService');

// Compliance thresholds
const LARGE_TRANSACTION_THRESHOLD = 10000;
const SUSPICIOUS_FREQUENCY_THRESHOLD = 10; // transactions per hour
const HIGH_RISK_COUNTRIES = ['XX', 'YY', 'ZZ']; // placeholder

class ComplianceService {
  /**
   * Screen a transaction for compliance issues
   */
  async screenTransaction(transaction) {
        const flags = [];

    // Check transaction amount
    if (transaction.amount >= LARGE_TRANSACTION_THRESHOLD) {
      flags.push({
                type: 'large_transaction',
                severity: 'medium',
                message: `Transaction amount $${transaction.amount} exceeds reporting threshold`,
        });
  }

    // Check transaction frequency
    const recentCount = await this.getRecentTransactionCount(
      transaction.fromAccount,
      60 * 60 * 1000 // last hour
    );

    if (recentCount >= SUSPICIOUS_FREQUENCY_THRESHOLD) {
      flags.push({
        type: 'high_frequency',
        severity: 'high',
        message: `${recentCount} transactions in the last hour from this account`,
});
}

    // Check for round-number structuring (potential money laundering)
    if (transaction.amount % 1000 === 0 && transaction.amount >= 5000) {
      flags.push({
        type: 'structuring_suspicion',
        severity: 'low',
        message: 'Round number transaction may indicate structuring',
});
}

    return {
      transactionId: transaction.transactionId,
      flagCount: flags.length,
      flags,
      requiresReview: flags.some(f => f.severity === 'high'),
      screenedAt: new Date(),
};
}

  /**
   * Get count of recent transactions for an account
   */
  async getRecentTransactionCount(accountId, windowMs) {
    const since = new Date(Date.now() - windowMs);
    return Transaction.countDocuments({
      fromAccount: accountId,
      createdAt: { $gte: since },
});
}

  /**
   * Run daily compliance report
   * TODO: This should be a scheduled job, not an API endpoint
   */
  async generateDailyReport(date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const transactions = await Transaction.find({
      createdAt: { $gte: startOfDay, $lte: endOfDay },
});

    const flaggedTransactions = transactions.filter(t => t.status === 'flagged');
    const largeTransactions = transactions.filter(t => t.amount >= LARGE_TRANSACTION_THRESHOLD);

    return {
      date: date.toISOString().split('T')[0],
      totalTransactions: transactions.length,
      totalVolume: transactions.reduce((sum, t) => sum + t.amount, 0),
      flaggedCount: flaggedTransactions.length,
      largeTransactionCount: largeTransactions.length,
      generatedAt: new Date(),
};
}

  /**
   * Check KYC status for an account owner
   */
  async checkKYCStatus(userId) {
    // Simplified KYC check
    const User = require('../models/User');
    const user = await User.findById(userId);

    if (!user) {
      return { status: 'not_found', verified: false };
}

    return {
      userId: user._id,
      verified: user.kycVerified,
      status: user.kycVerified ? 'verified' : 'pending',
      lastChecked: new Date(),
};
}
}

module.exports = new ComplianceService();
