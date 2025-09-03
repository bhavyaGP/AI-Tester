const auth = require('../../server/services/auth.js');
const jwt = require('jsonwebtoken');

jest.mock('jsonwebtoken');

describe('setTeacher', () => {
    const teacher = { teacher_id: 1 };
    beforeEach(() => {
        process.env.JWT_SECRET = 'testsecret';
    });
    afterEach(() => {
        delete process.env.JWT_SECRET;
    });
    test('should return a JWT for a teacher', () => {
        jwt.sign.mockReturnValue('mocktoken');
        const token = auth.setTeacher(teacher);
        expect(token).toBe('mocktoken');
        expect(jwt.sign).toHaveBeenCalledWith({ id: 1, role: 'teacher' }, 'testsecret', { expiresIn: '24h' });
    });
    test('should throw an error if JWT_SECRET is not set', () => {
        delete process.env.JWT_SECRET;
        expect(() => auth.setTeacher(teacher)).toThrow();
    });

});

describe('setAdmin', () => {
    const admin = { admin_id: 1 };
    beforeEach(() => {
        process.env.JWT_SECRET = 'testsecret';
    });
    afterEach(() => {
        delete process.env.JWT_SECRET;
    });
    test('should return a JWT for an admin', () => {
        jwt.sign.mockReturnValue('mocktoken');
        const token = auth.setAdmin(admin);
        expect(token).toBe('mocktoken');
        expect(jwt.sign).toHaveBeenCalledWith({ id: 1, role: 'admin' }, 'testsecret', { expiresIn: '24h' });
    });
    test('should throw an error if JWT_SECRET is not set', () => {
        delete process.env.JWT_SECRET;
        expect(() => auth.setAdmin(admin)).toThrow();
    });
});

describe('getUser', () => {
    beforeEach(() => {
        process.env.JWT_SECRET = 'testsecret';
    });
    afterEach(() => {
        delete process.env.JWT_SECRET;
    });
    test('should return null if token is null', () => {
        const user = auth.getUser(null);
        expect(user).toBeNull();
    });
    test('should return null if token is invalid', () => {
        jwt.verify.mockImplementation(() => { throw new Error('invalid token'); });
        const user = auth.getUser('invalidtoken');
        expect(user).toBeNull();
    });
    test('should return user if token is valid', () => {
        jwt.verify.mockReturnValue({ id: 1, role: 'teacher' });
        const user = auth.getUser('validtoken');
        expect(user).toEqual({ id: 1, role: 'teacher' });
        expect(jwt.verify).toHaveBeenCalledWith('validtoken', 'testsecret');
    });
    test('should throw an error if JWT_SECRET is not set', () => {
        delete process.env.JWT_SECRET;
        jwt.verify.mockReturnValue({id:1, role: 'teacher'});
        expect(() => auth.getUser('validtoken')).toThrow();
    });
});
