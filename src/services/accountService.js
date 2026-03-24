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
     * BUG: No transaction locking - race conditions possible with concurrent updates
     */
  async updateBalance(accountId, amount) {
        const account = await Account.findById(accountId);
        if (!account) {
                const error = new Error('Account not found');
                error.statusCode = 404;
                throw error;
        }

      // BUG: Direct balance manipulation without optimistic locking
      account.balance += amount;

      if (account.balance < 0) {
              const error = new Error('Insufficient funds');
              error.statusCode = 400;
              throw error;
      }

      return account.save();
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
