const Account = require('../models/Account');
const { v4: uuidv4 } = require('uuid');

class AccountService {
    /**
     * Create a new account
     */
  async createAccount(userId, accountData) {
        const accountNumber = this.generateAccountNumber();

      const account = new Account({
              accountNumber,
              accountType: accountData.type,
              owner: userId,
              currency: accountData.currency || 'USD',
              metadata: {
                        branch: accountData.branch || 'MAIN',
                        riskLevel: 'low',
              },
      });

      return account.save();
  }

  /**
     * Get account by ID
     */
  async getAccount(accountId) {
        const account = await Account.findById(accountId).populate('owner', 'firstName lastName email');
        if (!account) {
                const error = new Error('Account not found');
                error.statusCode = 404;
                throw error;
        }
        return account;
  }

  /**
     * Get all accounts for a user
     */
  async getUserAccounts(userId) {
        return Account.findByOwner(userId);
  }

  /**
     * Update account balance
     * Uses atomic MongoDB $inc with a balance floor condition to prevent race conditions
     */
  async updateBalance(accountId, amount) {
        // For withdrawals (negative amount), use an atomic findOneAndUpdate with a
        // condition that ensures the balance won't go below zero. This prevents race
        // conditions where concurrent withdrawals could both read the same balance.
        if (amount < 0) {
                const account = await Account.findOneAndUpdate(
                        { _id: accountId, balance: { $gte: Math.abs(amount) } },
                        { $inc: { balance: amount } },
                        { new: true }
                );

                if (!account) {
                        // Distinguish between "not found" and "insufficient funds"
                        const exists = await Account.findById(accountId);
                        if (!exists) {
                                const error = new Error('Account not found');
                                error.statusCode = 404;
                                throw error;
                        }
                        const error = new Error('Insufficient funds');
                        error.statusCode = 400;
                        throw error;
                }

                return account;
        }

        // For deposits (positive amount), use atomic $inc without a balance floor check
        const account = await Account.findOneAndUpdate(
                { _id: accountId },
                { $inc: { balance: amount } },
                { new: true }
        );

        if (!account) {
                const error = new Error('Account not found');
                error.statusCode = 404;
                throw error;
        }

        return account;
  }

  /**
     * Freeze an account
     */
  async freezeAccount(accountId, reason) {
        const account = await this.getAccount(accountId);

      if (account.status === 'closed') {
              const error = new Error('Cannot freeze a closed account');
              error.statusCode = 400;
              throw error;
      }

      return account.freeze();
  }

  /**
     * Close an account
     */
  async closeAccount(accountId) {
        const account = await this.getAccount(accountId);

      if (account.balance !== 0) {
              const error = new Error('Account must have zero balance before closing');
              error.statusCode = 400;
              throw error;
      }

      return account.close();
  }

  /**
     * Generate a unique account number
     */
  generateAccountNumber() {
        const prefix = 'FIN';
        const random = Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');
        return `${prefix}-${random}`;
  }
}

module.exports = new AccountService();
