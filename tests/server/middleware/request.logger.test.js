const requestLogger = require('../../server/middleware/request.logger.js');
const {mockReq, mockRes} = require('supertest');

describe('Request Logger Middleware', () => {
  it('should log a GET request with no body', () => {
    const req = mockReq({method: 'GET', url: '/test'});
    const res = mockRes();
    const next = jest.fn();
    console.log = jest.fn();
    requestLogger(req, res, next);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('GET /test '));
    expect(next).toHaveBeenCalled();
  });

  it('should log a POST request with a body', () => {
    const req = mockReq({method: 'POST', url: '/test', body: {test: 'body'}});
    const res = mockRes();
    const next = jest.fn();
    console.log = jest.fn();
    requestLogger(req, res, next);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('POST /test {"test":"body"}'));
    expect(next).toHaveBeenCalled();
  });

  it('should log a request with originalUrl if available', () => {
    const req = mockReq({method: 'GET', url: '/test', originalUrl: '/original/test'});
    const res = mockRes();
    const next = jest.fn();
    console.log = jest.fn();
    requestLogger(req, res, next);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('GET /original/test '));
    expect(next).toHaveBeenCalled();
  });

  it('should handle requests with empty body', () => {
    const req = mockReq({method: 'POST', url: '/test', body: {}});
    const res = mockRes();
    const next = jest.fn();
    console.log = jest.fn();
    requestLogger(req, res, next);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('POST /test '));
    expect(next).toHaveBeenCalled();
  });

  it('should handle requests with no body property', () => {
    const req = mockReq({method: 'POST', url: '/test'});
    const res = mockRes();
    const next = jest.fn();
    console.log = jest.fn();
    requestLogger(req, res, next);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('POST /test '));
    expect(next).toHaveBeenCalled();
  });

  it('should handle various HTTP methods', () => {
    const methods = ['PUT', 'DELETE', 'PATCH'];
    methods.forEach(method => {
      const req = mockReq({method, url: '/test'});
      const res = mockRes();
      const next = jest.fn();
      console.log = jest.fn();
      requestLogger(req, res, next);
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining(`${method} /test `));
      expect(next).toHaveBeenCalled();
    });
  });

  it('should log timestamp in ISO format', () => {
    const req = mockReq({method: 'GET', url: '/test'});
    const res = mockRes();
    const next = jest.fn();
    console.log = jest.fn();
    const now = new Date();
    jest.useFakeTimers().setSystemTime(now);
    requestLogger(req, res, next);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining(now.toISOString()));
    jest.useRealTimers();
  });
});
