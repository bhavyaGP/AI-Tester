const { checkAuth } = require('../../server/middleware/basicauth.js');
const { getUser } = require('../../server/services/auth.js');

jest.mock('../../server/services/auth.js');


describe('checkAuth middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = { cookies: {} };
    res = {
      redirect: jest.fn(),
      status: jest.fn(() => res),
      send: jest.fn(),
    };
    next = jest.fn();
  });

  it('should redirect to /loggin if no token is present', () => {
    checkAuth(req, res, next);
    expect(res.redirect).toHaveBeenCalledWith('/loggin');
  });

  it('should redirect to /loggin if token is invalid', () => {
    req.cookies.authToken = 'invalid-token';
    getUser.mockReturnValue(null);
    checkAuth(req, res, next);
    expect(res.redirect).toHaveBeenCalledWith('/loggin');
  });

  it('should call next if token is valid', () => {
    const mockUser = { id: 1, name: 'Test User' };
    req.cookies.authToken = 'valid-token';
    getUser.mockReturnValue(mockUser);
    checkAuth(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual(mockUser);
  });

  it('should handle undefined cookies gracefully', () => {
    delete req.cookies;
    checkAuth(req, res, next);
    expect(res.redirect).toHaveBeenCalledWith('/loggin');
  });

  it('should handle null token gracefully', () => {
    req.cookies.authToken = null;
    checkAuth(req, res, next);
    expect(res.redirect).toHaveBeenCalledWith('/loggin');
  });

  it('should handle empty token gracefully', () => {
    req.cookies.authToken = '';
    checkAuth(req, res, next);
    expect(res.redirect).toHaveBeenCalledWith('/loggin');
  });


});
