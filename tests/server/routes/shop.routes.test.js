const express = require('express');
const router = require('../routes/shop.routes');
const shopController = require('../controllers/shop.controller');
const authMiddleware = require('../middleware/authMiddleware');

jest.mock('../controllers/shop.controller');
jest.mock('../middleware/authMiddleware');


describe('Shop Router', () => {
  let req, res, next;

  beforeEach(() => {
    req = {};
    res = {
      json: jest.fn(),
      status: jest.fn(() => ({ send: jest.fn() }))
    };
    next = jest.fn();
  });

  describe('GET /', () => {
    it('should call listItems with authMiddleware', () => {
      router.handle({ url: '/', method: 'GET' }, req, res, next);
      expect(authMiddleware).toHaveBeenCalled();
      expect(shopController.listItems).toHaveBeenCalled();
    });
    it('should handle errors from listItems', () => {
      shopController.listItems.mockImplementation(() => { throw new Error('Test Error')});
      router.handle({ url: '/', method: 'GET' }, req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

  });

  describe('POST /buy', () => {
    it('should call buyItem with authMiddleware', () => {
      router.handle({ url: '/buy', method: 'POST' }, req, res, next);
      expect(authMiddleware).toHaveBeenCalled();
      expect(shopController.buyItem).toHaveBeenCalled();
    });
    it('should handle errors from buyItem', () => {
      shopController.buyItem.mockImplementation(() => { throw new Error('Test Error')});
      router.handle({ url: '/buy', method: 'POST' }, req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

  });


  it('should export an express router', () => {
    expect(typeof router).toBe('object');
    expect(router.stack).toBeDefined();
  });


});
