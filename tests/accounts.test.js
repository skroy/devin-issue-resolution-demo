const express = require('express');
const request = require('supertest');

// Mock accountService
jest.mock('../src/services/accountService');
const accountService = require('../src/services/accountService');

// Mock auth middleware to set req.userId and req.user
jest.mock('../src/api/middleware/auth', () => ({
    authenticate: (req, res, next) => {
          req.userId = req.headers['x-test-user-id'] || 'user-a-id';
          req.user = { _id: req.userId, role: 'customer' };
          next();
    },
    authorize: (...roles) => (req, res, next) => {
          if (!roles.includes(req.user.role)) {
                  return res.status(403).json({ error: 'Forbidden', message: 'Insufficient permissions' });
          }
          next();
    },
}));

// Build a minimal Express app with the accounts router
const app = express();
app.use(express.json());

const { authenticate } = require('../src/api/middleware/auth');
const accountRoutes = require('../src/api/routes/accounts');
app.use('/api/v1/accounts', authenticate, accountRoutes);

// Error handler
app.use((err, req, res, next) => {
    const status = err.statusCode || 500;
    res.status(status).json({ error: err.message });
});

describe('GET /api/v1/accounts/:id', () => {
    afterEach(() => {
          jest.clearAllMocks();
    });

    test('returns account when the authenticated user is the owner', async () => {
          const mockAccount = {
                  _id: 'account-123',
                  accountNumber: 'FIN-000000001',
                  accountType: 'checking',
                  owner: { _id: 'user-a-id', firstName: 'Alice', lastName: 'A', email: 'alice@example.com' },
                  balance: 1000,
                  status: 'active',
          };
          accountService.getAccount.mockResolvedValue(mockAccount);

          const res = await request(app)
                  .get('/api/v1/accounts/account-123')
                  .set('x-test-user-id', 'user-a-id');

          expect(res.status).toBe(200);
          expect(res.body.data._id).toBe('account-123');
    });

    test('returns 403 when the authenticated user is NOT the owner', async () => {
          const mockAccount = {
                  _id: 'account-123',
                  accountNumber: 'FIN-000000001',
                  accountType: 'checking',
                  owner: { _id: 'user-a-id', firstName: 'Alice', lastName: 'A', email: 'alice@example.com' },
                  balance: 1000,
                  status: 'active',
          };
          accountService.getAccount.mockResolvedValue(mockAccount);

          const res = await request(app)
                  .get('/api/v1/accounts/account-123')
                  .set('x-test-user-id', 'user-b-id');

          expect(res.status).toBe(403);
          expect(res.body.error).toBe('Forbidden');
          expect(res.body.message).toMatch(/permission/i);
    });

    test('returns 404 when account does not exist', async () => {
          const error = new Error('Account not found');
          error.statusCode = 404;
          accountService.getAccount.mockRejectedValue(error);

          const res = await request(app)
                  .get('/api/v1/accounts/nonexistent-id')
                  .set('x-test-user-id', 'user-a-id');

          expect(res.status).toBe(404);
    });
});
