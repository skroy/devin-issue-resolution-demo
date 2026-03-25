const mongoose = require('mongoose');
const Account = require('../src/models/Account');
const accountService = require('../src/services/accountService');

// Mock mongoose/Account methods
jest.mock('../src/models/Account');

describe('AccountService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('updateBalance', () => {
    const accountId = new mongoose.Types.ObjectId();

    test('deposits using atomic $inc operation', async () => {
      const mockAccount = { _id: accountId, balance: 200 };
      Account.findOneAndUpdate.mockResolvedValue(mockAccount);

      const result = await accountService.updateBalance(accountId, 100);

      expect(Account.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: accountId },
        { $inc: { balance: 100 } },
        { new: true }
      );
      expect(result).toEqual(mockAccount);
    });

    test('withdrawals include balance check in query filter', async () => {
      const mockAccount = { _id: accountId, balance: 25 };
      Account.findOneAndUpdate.mockResolvedValue(mockAccount);

      const result = await accountService.updateBalance(accountId, -75);

      expect(Account.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: accountId, balance: { $gte: 75 } },
        { $inc: { balance: -75 } },
        { new: true }
      );
      expect(result).toEqual(mockAccount);
    });

    test('throws "Insufficient funds" when withdrawal exceeds balance', async () => {
      Account.findOneAndUpdate.mockResolvedValue(null);
      Account.findById.mockResolvedValue({ _id: accountId, balance: 50 });

      await expect(accountService.updateBalance(accountId, -75))
        .rejects.toThrow('Insufficient funds');

      expect(Account.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: accountId, balance: { $gte: 75 } },
        { $inc: { balance: -75 } },
        { new: true }
      );
    });

    test('throws "Account not found" when account does not exist', async () => {
      Account.findOneAndUpdate.mockResolvedValue(null);
      Account.findById.mockResolvedValue(null);

      await expect(accountService.updateBalance(accountId, 100))
        .rejects.toThrow('Account not found');
    });

    test('concurrent withdrawals cannot both succeed when funds are insufficient', async () => {
      // Simulate two concurrent $75 withdrawals on a $100 balance account.
      // The atomic query { balance: { $gte: 75 } } ensures only one can match.
      // First call succeeds (balance goes to 25), second returns null (insufficient).
      Account.findOneAndUpdate
        .mockResolvedValueOnce({ _id: accountId, balance: 25 })
        .mockResolvedValueOnce(null);
      Account.findById.mockResolvedValue({ _id: accountId, balance: 25 });

      const [result1, result2] = await Promise.allSettled([
        accountService.updateBalance(accountId, -75),
        accountService.updateBalance(accountId, -75),
      ]);

      expect(result1.status).toBe('fulfilled');
      expect(result1.value.balance).toBe(25);

      expect(result2.status).toBe('rejected');
      expect(result2.reason.message).toBe('Insufficient funds');
    });

    test('sets statusCode 404 for missing account', async () => {
      Account.findOneAndUpdate.mockResolvedValue(null);
      Account.findById.mockResolvedValue(null);

      try {
        await accountService.updateBalance(accountId, 50);
      } catch (error) {
        expect(error.statusCode).toBe(404);
      }
    });

    test('sets statusCode 400 for insufficient funds', async () => {
      Account.findOneAndUpdate.mockResolvedValue(null);
      Account.findById.mockResolvedValue({ _id: accountId, balance: 10 });

      try {
        await accountService.updateBalance(accountId, -50);
      } catch (error) {
        expect(error.statusCode).toBe(400);
      }
    });
  });
});
