// Mock mongoose before anything else that imports models
jest.mock('mongoose', () => {
  class FakeSchema {
    constructor() {
      this.methods = {};
      this.statics = {};
      this.obj = {};
    }
    virtual() { return { get: jest.fn() }; }
  }
  FakeSchema.Types = { ObjectId: 'ObjectId' };
  const mModel = { findById: jest.fn(), find: jest.fn() };
  return {
    Schema: FakeSchema,
    model: jest.fn(() => mModel),
    connect: jest.fn(),
    Types: { ObjectId: class {} },
  };
});

// Mock auth middleware to inject req.userId and req.user
jest.mock('../src/api/middleware/auth', () => ({
  authenticate: (req, res, next) => {
    req.userId = req.headers['x-test-user-id'] || 'user-a-id';
    req.user = {
      _id: req.userId,
      role: req.headers['x-test-user-role'] || 'customer',
    };
    next();
  },
  authorize: (...roles) => (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden', message: 'Insufficient permissions' });
    }
    next();
  },
  generateToken: jest.fn(),
}));

// Mock accountService
jest.mock('../src/services/accountService');

const accountService = require('../src/services/accountService');

const express = require('express');
const request = require('supertest');

// Build a minimal app with the accounts router
function createApp() {
  const app = express();
  app.use(express.json());
  const { authenticate } = require('../src/api/middleware/auth');
  const accountRoutes = require('../src/api/routes/accounts');
  app.use('/api/v1/accounts', authenticate, accountRoutes);
  app.use((err, req, res, next) => {
    const status = err.statusCode || 500;
    res.status(status).json({ error: err.message });
  });
  return app;
}

describe('GET /api/v1/accounts/:id - ownership check', () => {
  let app;

  beforeAll(() => {
    app = createApp();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('returns account when user is the owner', async () => {
    const mockAccount = {
      _id: 'account-1',
      owner: { _id: 'user-a-id', firstName: 'Alice', lastName: 'A', email: 'a@test.com' },
      accountType: 'checking',
      balance: 1000,
    };
    accountService.getAccount.mockResolvedValue(mockAccount);

    const res = await request(app)
      .get('/api/v1/accounts/account-1')
      .set('x-test-user-id', 'user-a-id')
      .set('x-test-user-role', 'customer');

    expect(res.status).toBe(200);
    expect(res.body.data._id).toBe('account-1');
  });

  test('returns 403 when user is NOT the owner', async () => {
    const mockAccount = {
      _id: 'account-1',
      owner: { _id: 'user-a-id', firstName: 'Alice', lastName: 'A', email: 'a@test.com' },
      accountType: 'checking',
      balance: 1000,
    };
    accountService.getAccount.mockResolvedValue(mockAccount);

    const res = await request(app)
      .get('/api/v1/accounts/account-1')
      .set('x-test-user-id', 'user-b-id')
      .set('x-test-user-role', 'customer');

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Forbidden');
    expect(res.body.message).toMatch(/permission/i);
  });

  test('allows admin to view any account', async () => {
    const mockAccount = {
      _id: 'account-1',
      owner: { _id: 'user-a-id', firstName: 'Alice', lastName: 'A', email: 'a@test.com' },
      accountType: 'checking',
      balance: 1000,
    };
    accountService.getAccount.mockResolvedValue(mockAccount);

    const res = await request(app)
      .get('/api/v1/accounts/account-1')
      .set('x-test-user-id', 'admin-id')
      .set('x-test-user-role', 'admin');

    expect(res.status).toBe(200);
    expect(res.body.data._id).toBe('account-1');
  });

  test('allows compliance_officer to view any account', async () => {
    const mockAccount = {
      _id: 'account-1',
      owner: { _id: 'user-a-id', firstName: 'Alice', lastName: 'A', email: 'a@test.com' },
      accountType: 'checking',
      balance: 1000,
    };
    accountService.getAccount.mockResolvedValue(mockAccount);

    const res = await request(app)
      .get('/api/v1/accounts/account-1')
      .set('x-test-user-id', 'compliance-id')
      .set('x-test-user-role', 'compliance_officer');

    expect(res.status).toBe(200);
    expect(res.body.data._id).toBe('account-1');
  });

  test('handles non-populated owner (raw ObjectId)', async () => {
    const mockAccount = {
      _id: 'account-1',
      owner: 'user-a-id',
      accountType: 'checking',
      balance: 1000,
    };
    accountService.getAccount.mockResolvedValue(mockAccount);

    // Owner matches
    const res = await request(app)
      .get('/api/v1/accounts/account-1')
      .set('x-test-user-id', 'user-a-id')
      .set('x-test-user-role', 'customer');

    expect(res.status).toBe(200);

    // Non-owner is blocked
    const res2 = await request(app)
      .get('/api/v1/accounts/account-1')
      .set('x-test-user-id', 'user-b-id')
      .set('x-test-user-role', 'customer');

    expect(res2.status).toBe(403);
  });

  test('returns 404 when account does not exist', async () => {
    const error = new Error('Account not found');
    error.statusCode = 404;
    accountService.getAccount.mockRejectedValue(error);

    const res = await request(app)
      .get('/api/v1/accounts/nonexistent')
      .set('x-test-user-id', 'user-a-id')
      .set('x-test-user-role', 'customer');

    expect(res.status).toBe(404);
  });
});
