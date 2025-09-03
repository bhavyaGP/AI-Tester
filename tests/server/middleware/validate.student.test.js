const validate = require('../../server/middleware/validate.student.js');

describe('isNonEmptyString', () => {
    test('returns true for non-empty strings', () => {
        expect(validate.isNonEmptyString('test')).toBe(true);
        expect(validate.isNonEmptyString(' test ')).toBe(true);
    });
    test('returns false for empty strings', () => {
        expect(validate.isNonEmptyString('')).toBe(false);
        expect(validate.isNonEmptyString('   ')).toBe(false);
    });
    test('returns false for non-strings', () => {
        expect(validate.isNonEmptyString(123)).toBe(false);
        expect(validate.isNonEmptyString(null)).toBe(false);
        expect(validate.isNonEmptyString(undefined)).toBe(false);
        expect(validate.isNonEmptyString({})).toBe(false);
        expect(validate.isNonEmptyString([])).toBe(false);
    });
});

describe('validate.validateCreate', () => {
    const req = { body: {} };
    const res = {
        status: jest.fn(() => ({ json: jest.fn() })),
    };
    const next = jest.fn();

    test('returns 400 if name is missing', () => {
        validate.validateCreate(req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.status().json).toHaveBeenCalledWith({ errors: ['name is required and must be a non-empty string'] });
    });

    test('returns 400 if name is not a string', () => {
        req.body.name = 123;
        validate.validateCreate(req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    test('returns 400 if surname is not a string', () => {
        req.body = { name: 'test', surname: 123 };
        validate.validateCreate(req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    test('calls next if input is valid', () => {
        req.body = { name: 'test' };
        validate.validateCreate(req, res, next);
        expect(next).toHaveBeenCalled();
        expect(req.body.name).toBe('test');
    });

    test('trims name and surname', () => {
        req.body = { name: ' test ', surname: ' surname ' };
        validate.validateCreate(req, res, next);
        expect(req.body.name).toBe('test');
        expect(req.body.surname).toBe('surname');
    });
});

describe('validate.validateBulk', () => {
    const res = {
        status: jest.fn(() => ({ json: jest.fn() })),
    };
    const next = jest.fn();

    test('returns 400 if body is not an array', () => {
        validate.validateBulk({ body: {} }, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    test('returns 400 if an item is missing name', () => {
        validate.validateBulk({ body: [{ surname: 'test' }] }, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    test('returns 400 if an item has invalid surname', () => {
        validate.validateBulk({ body: [{ name: 'test', surname: 123 }] }, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    test('calls next if input is valid', () => {
        validate.validateBulk({ body: [{ name: 'test' }, { name: 'test2', surname: 'test2' }] }, res, next);
        expect(next).toHaveBeenCalled();
    });

    test('trims name and surname', () => {
        validate.validateBulk({ body: [{ name: ' test ', surname: ' surname ' }] }, res, next);
        expect(res.status().json).not.toHaveBeenCalled();
    });

    test('handles empty array', () => {
        validate.validateBulk({ body: [] }, res, next);
        expect(next).toHaveBeenCalled();
    });
});
