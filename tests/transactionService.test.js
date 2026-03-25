const mongoose = require('mongoose');

// Mock the Transaction model
jest.mock('../src/models/Transaction', () => {
    const mockAggregate = jest.fn();
    return {
          aggregate: mockAggregate,
          __mockAggregate: mockAggregate,
    };
});

// Mock accountService
jest.mock('../src/services/accountService', () => ({}));

// Mock uuid
jest.mock('uuid', () => ({ v4: () => 'mock-uuid' }));

const Transaction = require('../src/models/Transaction');
const transactionService = require('../src/services/transactionService');

describe('TransactionService', () => {
    describe('getTransactionSummary', () => {
          const accountId = new mongoose.Types.ObjectId();
          const startDate = new Date('2024-01-01');
          const endDate = new Date('2024-01-31');

          afterEach(() => {
                jest.clearAllMocks();
          });

          test('uses aggregation pipeline instead of find', async () => {
                Transaction.aggregate.mockResolvedValue([{
                        _id: null,
                        totalDebit: 500,
                        totalCredit: 300,
                        transactionCount: 5,
                }]);

                await transactionService.getTransactionSummary(accountId, startDate, endDate);

                expect(Transaction.aggregate).toHaveBeenCalledTimes(1);
                const pipeline = Transaction.aggregate.mock.calls[0][0];
                expect(pipeline).toHaveLength(2);
                expect(pipeline[0]).toHaveProperty('$match');
                expect(pipeline[1]).toHaveProperty('$group');
          });

          test('$match stage filters by account, date range, and completed status', async () => {
                Transaction.aggregate.mockResolvedValue([{
                        _id: null,
                        totalDebit: 0,
                        totalCredit: 0,
                        transactionCount: 0,
                }]);

                await transactionService.getTransactionSummary(accountId, startDate, endDate);

                const matchStage = Transaction.aggregate.mock.calls[0][0][0].$match;
                expect(matchStage).toHaveProperty('$or');
                expect(matchStage.$or).toEqual(
                        expect.arrayContaining([
                                expect.objectContaining({ fromAccount: expect.any(mongoose.Types.ObjectId) }),
                                expect.objectContaining({ toAccount: expect.any(mongoose.Types.ObjectId) }),
                        ])
                );
                expect(matchStage).toHaveProperty('createdAt');
                expect(matchStage.createdAt).toHaveProperty('$gte');
                expect(matchStage.createdAt).toHaveProperty('$lte');
                expect(matchStage.status).toBe('completed');
          });

          test('$group stage computes totalDebit, totalCredit, and transactionCount', async () => {
                Transaction.aggregate.mockResolvedValue([{
                        _id: null,
                        totalDebit: 0,
                        totalCredit: 0,
                        transactionCount: 0,
                }]);

                await transactionService.getTransactionSummary(accountId, startDate, endDate);

                const groupStage = Transaction.aggregate.mock.calls[0][0][1].$group;
                expect(groupStage._id).toBeNull();
                expect(groupStage).toHaveProperty('totalDebit');
                expect(groupStage).toHaveProperty('totalCredit');
                expect(groupStage).toHaveProperty('transactionCount');
          });

          test('returns correct summary from aggregation results', async () => {
                Transaction.aggregate.mockResolvedValue([{
                        _id: null,
                        totalDebit: 500,
                        totalCredit: 300,
                        transactionCount: 5,
                }]);

                const result = await transactionService.getTransactionSummary(accountId, startDate, endDate);

                expect(result).toEqual({
                        totalDebit: 500,
                        totalCredit: 300,
                        netFlow: -200,
                        transactionCount: 5,
                        period: { startDate, endDate },
                });
          });

          test('returns zero values when no transactions match', async () => {
                Transaction.aggregate.mockResolvedValue([]);

                const result = await transactionService.getTransactionSummary(accountId, startDate, endDate);

                expect(result).toEqual({
                        totalDebit: 0,
                        totalCredit: 0,
                        netFlow: 0,
                        transactionCount: 0,
                        period: { startDate, endDate },
                });
          });

          test('converts string accountId to ObjectId', async () => {
                const stringId = accountId.toString();
                Transaction.aggregate.mockResolvedValue([]);

                await transactionService.getTransactionSummary(stringId, startDate, endDate);

                const matchStage = Transaction.aggregate.mock.calls[0][0][0].$match;
                const fromAccountId = matchStage.$or[0].fromAccount;
                expect(fromAccountId).toBeInstanceOf(mongoose.Types.ObjectId);
          });
    });
});
