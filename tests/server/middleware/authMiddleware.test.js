const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const authMiddleware = require('../middleware/auth.middleware');

jest.mock('jsonwebtoken');
jest.mock('../models/user.model');

describe('Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = { headers: {} };
    res = {
      status: jest.fn(() => ({ json: jest.fn() })),
    };
    next = jest.fn();
    process.env.JWT_SECRET = 'testsecret';
  });

  it('should return 401 if no authorization header', async () => {
    await authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.status().json).toHaveBeenCalledWith({ error: 'No token provided' });
  });

  it('should return 401 if authorization header does not start with Bearer', async () => {
    req.headers.authorization = 'Invalid token';
    await authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.status().json).toHaveBeenCalledWith({ error: 'No token provided' });
  });

  it('should return 401 if token verification fails', async () => {
    req.headers.authorization = 'Bearer invalidtoken';
    jwt.verify.mockImplementation(() => { throw new Error('jwt error') });
    await authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.status().json).toHaveBeenCalledWith({ error: 'Invalid token' });
  });

  it('should return 401 if user not found', async () => {
    req.headers.authorization = 'Bearer validtoken';
    jwt.verify.mockReturnValue({ userId: '123' });
    User.findById.mockResolvedValue(null);
    await authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.status().json).toHaveBeenCalledWith({ error: 'User not found' });
  });

  it('should call next if user found', async () => {
    req.headers.authorization = 'Bearer validtoken';
    const mockUser = { _id: '123' };
    jwt.verify.mockReturnValue({ userId: '123' });
    User.findById.mockResolvedValue(mockUser);
    await authMiddleware(req, res, next);
    expect(req.user).toEqual(mockUser);
    expect(next).toHaveBeenCalled();
  });

  it('should handle errors during findById', async () => {
    req.headers.authorization = 'Bearer validtoken';
    jwt.verify.mockReturnValue({ userId: '123' });
    User.findById.mockRejectedValue(new Error('db error'));
    await authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.status().json).toHaveBeenCalledWith({ error: 'Invalid token' });
  });

  it('should handle token with extra spaces', async () => {
    req.headers.authorization = 'Bearer  validtoken  ';
    const mockUser = { _id: '123' };
    jwt.verify.mockReturnValue({ userId: '123' });
    User.findById.mockResolvedValue(mockUser);
    await authMiddleware(req, res, next);
    expect(req.user).toEqual(mockUser);
    expect(next).toHaveBeenCalled();
  });
});
