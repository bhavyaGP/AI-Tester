const express = require('express');
const router = require('../router');
const shopController = require('../controllers/shop.controller');
const authMiddleware = require('../middleware/authMiddleware');

jest.mock('../controllers/shop.controller');
jest.mock('../middleware/authMiddleware');

describe('Shop Router', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET / calls authMiddleware and shopController.getStoreItems with valid middleware', () => {
    const req = {};
    const res = {};
    const next = jest.fn();
    authMiddleware.mockImplementation((req, res, next) => next());
    shopController.getStoreItems.mockImplementation((req, res) => {});

    router.handle({ url: '/', method: 'GET' }, req, res, next);

    expect(authMiddleware).toHaveBeenCalledWith(req, res, expect.any(Function));
    expect(shopController.getStoreItems).toHaveBeenCalledWith(req, res);
  });


  test('GET / calls next() with error if authMiddleware throws an error', () => {
    const req = {};
    const res = {};
    const next = jest.fn();
    const error = new Error('Authentication failed');
    authMiddleware.mockImplementation((req, res, next) => next(error));
    shopController.getStoreItems.mockImplementation((req, res) => {});

    router.handle({ url: '/', method: 'GET' }, req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(shopController.getStoreItems).not.toHaveBeenCalled();
  });

  test('GET / handles other HTTP methods', () => {
    const req = {};
    const res = {};
    const next = jest.fn();
    router.handle({ url: '/', method: 'POST' }, req, res, next);
    expect(next).toHaveBeenCalledWith();
    router.handle({ url: '/other', method: 'GET' }, req, res, next);
    expect(next).toHaveBeenCalledWith();

  });


});
