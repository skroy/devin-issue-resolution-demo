const mongoose = require('mongoose');
const Transaction = require('../src/models/Transaction');

describe('Transaction Model', () => {
  describe('Schema indexes', () => {
    const indexes = Transaction.schema.indexes();

    // Helper: check if a given index key pattern exists in the schema indexes
    function hasIndex(keyPattern) {
      return indexes.some(([fields]) => {
        const keys = Object.entries(keyPattern);
        return keys.every(([k, v]) => fields[k] === v) &&
          Object.keys(fields).length === keys.length;
      });
    }

    test('has index on { fromAccount: 1, status: 1 }', () => {
      expect(hasIndex({ fromAccount: 1, status: 1 })).toBe(true);
    });

    test('has index on { createdAt: 1 } for date-range queries', () => {
      expect(hasIndex({ createdAt: 1 })).toBe(true);
    });

    test('has index on { fromAccount: 1, createdAt: -1 } for account date-range lookups', () => {
      expect(hasIndex({ fromAccount: 1, createdAt: -1 })).toBe(true);
    });

    test('has index on { status: 1, createdAt: 1 } for status + date-range queries', () => {
      expect(hasIndex({ status: 1, createdAt: 1 })).toBe(true);
    });
  });

  describe('Schema fields', () => {
    test('has timestamps enabled', () => {
      expect(Transaction.schema.options.timestamps).toBe(true);
    });

    test('has required fields', () => {
      const paths = Transaction.schema.paths;
      expect(paths.transactionId.isRequired).toBe(true);
      expect(paths.fromAccount.isRequired).toBe(true);
      expect(paths.amount.isRequired).toBe(true);
      expect(paths.type.isRequired).toBe(true);
    });
  });
});
