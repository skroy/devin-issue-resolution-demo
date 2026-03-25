const jwt = require('jsonwebtoken');

const JWT_SECRET = 'default-secret-change-me';

// Mock User model
jest.mock('../src/models/User', () => ({
  findById: jest.fn(),
}));

const User = require('../src/models/User');
const { authenticate } = require('../src/api/middleware/auth');

function createMockReqRes(token) {
  const req = {
    headers: {
      authorization: token ? `Bearer ${token}` : undefined,
    },
  };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  const next = jest.fn();
  return { req, res, next };
}

describe('authenticate middleware - JWT expiry', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('rejects token when exp equals current time (off-by-one fix)', async () => {
    const now = Math.floor(Date.now() / 1000);

    // Mock jwt.verify to return decoded payload without its own expiry check,
    // so we can test the middleware's custom expiry logic in isolation.
    jest.spyOn(jwt, 'verify').mockReturnValue({
      userId: 'user123',
      email: 'test@example.com',
      role: 'customer',
      exp: now,
    });

    jest.spyOn(Date, 'now').mockReturnValue(now * 1000);

    const token = 'mock-token';
    const { req, res, next } = createMockReqRes(token);

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Token has expired' })
    );
    expect(next).not.toHaveBeenCalled();
  });

  test('accepts token that has not yet expired (exp > now)', async () => {
    const now = Math.floor(Date.now() / 1000);

    jest.spyOn(jwt, 'verify').mockReturnValue({
      userId: 'user123',
      email: 'test@example.com',
      role: 'customer',
      exp: now + 60,
    });

    jest.spyOn(Date, 'now').mockReturnValue(now * 1000);

    const mockUser = { _id: 'user123', status: 'active', role: 'customer' };
    User.findById.mockResolvedValue(mockUser);

    const token = 'mock-token';
    const { req, res, next } = createMockReqRes(token);

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('rejects token that expired in the past', async () => {
    const now = Math.floor(Date.now() / 1000);

    jest.spyOn(jwt, 'verify').mockReturnValue({
      userId: 'user123',
      email: 'test@example.com',
      role: 'customer',
      exp: now - 10,
    });

    jest.spyOn(Date, 'now').mockReturnValue(now * 1000);

    const token = 'mock-token';
    const { req, res, next } = createMockReqRes(token);

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Token has expired' })
    );
    expect(next).not.toHaveBeenCalled();
  });
});
