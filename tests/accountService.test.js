const AccountService = require('../src/services/accountService');
const Account = require('../src/models/Account');

// Mock the Account model
jest.mock('../src/models/Account');

describe('AccountService', () => {
    beforeEach(() => {
          jest.clearAllMocks();
    });

    describe('updateBalance', () => {
          describe('withdrawals (negative amount)', () => {
                test('uses atomic findOneAndUpdate for withdrawals to prevent race conditions', async () => {
                        const mockAccount = { _id: 'acc123', balance: 25 };
                        Account.findOneAndUpdate.mockResolvedValue(mockAccount);

                        const result = await AccountService.updateBalance('acc123', -75);

                        expect(Account.findOneAndUpdate).toHaveBeenCalledWith(
                                { _id: 'acc123', balance: { $gte: 75 } },
                                { $inc: { balance: -75 } },
                                { new: true }
                        );
                        expect(result).toEqual(mockAccount);
                });

                test('throws Insufficient funds when balance is too low', async () => {
                        Account.findOneAndUpdate.mockResolvedValue(null);
                        Account.findById.mockResolvedValue({ _id: 'acc123', balance: 50 });

                        await expect(AccountService.updateBalance('acc123', -75))
                                .rejects.toMatchObject({
                                        message: 'Insufficient funds',
                                        statusCode: 400,
                                });
                });

                test('throws Account not found when account does not exist', async () => {
                        Account.findOneAndUpdate.mockResolvedValue(null);
                        Account.findById.mockResolvedValue(null);

                        await expect(AccountService.updateBalance('acc123', -75))
                                .rejects.toMatchObject({
                                        message: 'Account not found',
                                        statusCode: 404,
                                });
                });
          });

          describe('deposits (positive amount)', () => {
                test('uses atomic findOneAndUpdate for deposits', async () => {
                        const mockAccount = { _id: 'acc123', balance: 200 };
                        Account.findOneAndUpdate.mockResolvedValue(mockAccount);

                        const result = await AccountService.updateBalance('acc123', 100);

                        expect(Account.findOneAndUpdate).toHaveBeenCalledWith(
                                { _id: 'acc123' },
                                { $inc: { balance: 100 } },
                                { new: true }
                        );
                        expect(result).toEqual(mockAccount);
                });

                test('throws Account not found for deposits to nonexistent account', async () => {
                        Account.findOneAndUpdate.mockResolvedValue(null);

                        await expect(AccountService.updateBalance('acc123', 100))
                                .rejects.toMatchObject({
                                        message: 'Account not found',
                                        statusCode: 404,
                                });
                });
          });

          describe('concurrent withdrawal protection', () => {
                test('only one of two concurrent withdrawals succeeds when balance is insufficient for both', async () => {
                        // Simulate: account has $100, two concurrent $75 withdrawals
                        // First call succeeds (atomic update finds balance >= 75)
                        // Second call fails (atomic update finds balance < 75 after first withdrawal)
                        Account.findOneAndUpdate
                                .mockResolvedValueOnce({ _id: 'acc123', balance: 25 })  // first succeeds
                                .mockResolvedValueOnce(null);                             // second fails atomically
                        Account.findById.mockResolvedValue({ _id: 'acc123', balance: 25 });

                        const result1 = await AccountService.updateBalance('acc123', -75);
                        expect(result1.balance).toBe(25);

                        await expect(AccountService.updateBalance('acc123', -75))
                                .rejects.toMatchObject({
                                        message: 'Insufficient funds',
                                        statusCode: 400,
                                });
                });
          });
    });
});
