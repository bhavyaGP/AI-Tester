const { handlebasiclogin } = require('../../server/controllers/rolehandle.js');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const supertest = require('supertest');
const express = require('express');
const { setTeacher, setAdmin } = require('../services/auth.js'); // Adjust path if needed


jest.mock('@prisma/client', () => ({
    PrismaClient: jest.fn().mockImplementation(() => ({
        teacher: {
            findFirst: jest.fn(),
        },
        schoolSchema: {
            findFirst: jest.fn(),
        },
    })),
}));

jest.mock('../services/auth.js', () => ({
    setTeacher: jest.fn(),
    setAdmin: jest.fn(),
}));


describe('handlebasiclogin', () => {
    let req;
    let res;
    beforeEach(() => {
        req = { body: {} };
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
            json: jest.fn(),
            cookie: jest.fn(),
        };
    });

    it('should successfully log in a teacher', async () => {
        const mockTeacher = { id: 1, username: 'testuser', password: 'testpassword', school: { resultout: true } };
        const mockToken = 'mocktoken';
        prisma.teacher.findFirst.mockResolvedValue(mockTeacher);
        setTeacher.mockReturnValue(mockToken);
        req.body = { username: 'testuser', password: 'testpassword' };
        await handlebasiclogin(req, res);
        expect(prisma.teacher.findFirst).toHaveBeenCalledWith({
            where: { username: 'testuser', password: 'testpassword' },
            include: { school: { select: { resultout: true } } },
        });
        expect(setTeacher).toHaveBeenCalledWith(mockTeacher);
        expect(res.cookie).toHaveBeenCalledWith('authToken', mockToken, { maxAge: 86400000 });
        expect(res.json).toHaveBeenCalledWith({ message: 'Login successful. You will be redirected to the teacher dashboard.', token: mockToken, user: mockTeacher });
    });

    it('should successfully log in an admin', async () => {
        const mockAdminSchool = { school_id: 1, school_name: 'testschool', school_add: 'testadress', school_dist: 'testdistrict', resultout: true, password: 'testpassword' };
        const mockAdmin = { admin_id: 1 };
        const mockToken = 'mocktoken';
        prisma.schoolSchema.findFirst.mockResolvedValue(mockAdminSchool);
        setAdmin.mockReturnValue(mockToken);
        req.body = { username: 'admin', password: 'testpassword' };
        await handlebasiclogin(req, res);
        expect(prisma.schoolSchema.findFirst).toHaveBeenCalledWith({
            where: { password: 'testpassword' },
            select: { school_id: true, school_name: true, school_add: true, school_dist: true, resultout: true },
        });
        expect(setAdmin).toHaveBeenCalledWith(mockAdmin);
        expect(res.cookie).toHaveBeenCalledWith('authToken', mockToken, { httpOnly: false, maxAge: 86400000 });
        expect(res.json).toHaveBeenCalledWith({ message: 'Login successful. You will be redirected to the admin dashboard.', token: mockToken, admin: mockAdmin, school: mockAdminSchool });
    });

    it('should handle invalid credentials', async () => {
        prisma.teacher.findFirst.mockResolvedValue(null);
        prisma.schoolSchema.findFirst.mockResolvedValue(null);
        req.body = { username: 'testuser', password: 'wrongpassword' };
        await handlebasiclogin(req, res);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.send).toHaveBeenCalledWith('Invalid credentials');
    });

    it('should handle database errors', async () => {
        const mockError = new Error('Database error');
        prisma.teacher.findFirst.mockRejectedValue(mockError);
        req.body = { username: 'testuser', password: 'testpassword' };
        await handlebasiclogin(req, res);
        expect(console.error).toHaveBeenCalledWith('Error during login:', mockError);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith('Internal server error');
    });
});

const app = express();
app.use(express.json());
app.post('/login', handlebasiclogin);


describe('handlebasiclogin - Integration Test with supertest', () => {
    it('should successfully login a teacher via POST request', async () => {
        const mockTeacher = { id: 1, username: 'testuser', password: 'testpassword', school: { resultout: true } };
        const mockToken = 'mocktoken';
        prisma.teacher.findFirst.mockResolvedValue(mockTeacher);
        setTeacher.mockReturnValue(mockToken);

        const response = await supertest(app).post('/login').send({ username: 'testuser', password: 'testpassword' });
        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Login successful. You will be redirected to the teacher dashboard.');
        expect(response.body.token).toBeDefined();
        expect(response.body.user).toBeDefined();

    });

    it('should return 401 for invalid credentials', async () => {
        prisma.teacher.findFirst.mockResolvedValue(null);
        prisma.schoolSchema.findFirst.mockResolvedValue(null);
        const response = await supertest(app).post('/login').send({ username: 'testuser', password: 'wrongpassword' });
        expect(response.status).toBe(401);
        expect(response.text).toBe('Invalid credentials');
    });
})
