const express = require('express');
const request = require('supertest');
const router = require('../routes/auth.routes'); // Assuming the file is named auth.routes.js
const authMiddleware = require('../middleware/authMiddleware'); // Replace with actual path if different

jest.mock('../middleware/authMiddleware');
jest.mock('../controllers/auth.controller');

const { handlelogin, handlelogout, handleregister } = require('../controllers/auth.controller');


describe('Auth Router', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use('/auth', router);
  });

  describe('POST /login', () => {
    it('should call handlelogin controller', async () => {
      const req = {body: {username: 'testuser', password: 'testpassword'}};
      const res = {json: jest.fn()};
      await handlelogin(req,res);
      expect(handlelogin).toHaveBeenCalledWith(req, res);
    });
  });

  describe('POST /register', () => {
    it('should call handleregister controller', async () => {
        const req = {body: {username: 'testuser', password: 'testpassword'}};
        const res = {json: jest.fn()};
        await handleregister(req,res);
        expect(handleregister).toHaveBeenCalledWith(req, res);
      });
  });

  describe('GET /logout', () => {
    it('should call handlelogout controller', async () => {
      const req = {};
      const res = {json: jest.fn()};
      await handlelogout(req, res);
      expect(handlelogout).toHaveBeenCalledWith(req, res);
    });
  });

  describe('GET /profile', () => {
    it('should call authMiddleware and return user data', async () => {
      const req = { user: { id: 1, username: 'testuser' } };
      const res = { json: jest.fn() };
      authMiddleware.mockImplementation((req, res, next) => next());
      await router.handle( {method: 'GET', url: '/profile'}, req, res)

      expect(authMiddleware).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ user: req.user });
    });
    it('should handle middleware error', async () => {
        const req = {};
        const res = { json: jest.fn(), status: jest.fn() };
        const next = jest.fn();
        authMiddleware.mockImplementation((req, res, next) => next(new Error('Auth failed')));
        await router.handle( {method: 'GET', url: '/profile'}, req, res, next);
        expect(next).toHaveBeenCalledWith(new Error('Auth failed'));

      });
  });

  describe('Error Handling', () => {
    it('should handle invalid routes', async () => {
      await request(app).get('/invalid').expect(404);
    });
  });
});
