const { registerTeacher, dashboarddata, tabulardata, declareResult, teacherdata } = require('../../server/controllers/admin.js');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

jest.mock('@prisma/client');
jest.mock('../services/mailer.js');
jest.mock('../controllers/manageresult.js');


describe('registerTeacher', () => {
    let req, res;
    beforeEach(() => {
        req = { body: {} };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
    });

    it('should return 400 if required fields are missing', async () => {
        await registerTeacher(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'All fields are required.' });
    });

    it('should return 400 if school_id is invalid', async () => {
        req.body = { teacher_fname: 'John', teacher_lname: 'Doe', allocated_standard: '5', teacher_email: 'john.doe@example.com', school_id: 'abc', dob: '01/01/2000' };
        await registerTeacher(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Invalid school_id format.' });
    });

    it('should return 400 if school_id does not exist', async () => {
        req.body = { teacher_fname: 'John', teacher_lname: 'Doe', allocated_standard: '5', teacher_email: 'john.doe@example.com', school_id: 1, dob: '01/01/2000' };
        prisma.schoolSchema.findUnique.mockResolvedValue(null);
        await registerTeacher(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Invalid school_id. School not found.' });
    });

    it('should return 400 if dob format is invalid', async () => {
        req.body = { teacher_fname: 'John', teacher_lname: 'Doe', allocated_standard: '5', teacher_email: 'john.doe@example.com', school_id: 1, dob: '01/01/200' };
        prisma.schoolSchema.findUnique.mockResolvedValue({ school_id: 1 });
        await registerTeacher(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Invalid dob format. Please use DD/MM/YYYY format.' });
    });

    it('should create a new teacher', async () => {
        req.body = { teacher_fname: 'John', teacher_lname: 'Doe', allocated_standard: '5', teacher_email: 'john.doe@example.com', school_id: 1, dob: '01/01/2000' };
        prisma.schoolSchema.findUnique.mockResolvedValue({ school_id: 1 });
        prisma.teacher.create.mockResolvedValue({ teacher_id: 1, teacher_fname: 'John', teacher_lname: 'Doe', allocated_standard: '5', teacher_email: 'john.doe@example.com', school_id: 1, password: '01012000', DOB: new Date('2000-01-01T00:00:00.000Z'), username: 'John@1' });
        prisma.teacher.update.mockResolvedValue({ teacher_id: 1, teacher_fname: 'John', teacher_lname: 'Doe', allocated_standard: '5', teacher_email: 'john.doe@example.com', school_id: 1, password: '01012000', DOB: new Date('2000-01-01T00:00:00.000Z'), username: 'John@1' });
        await registerTeacher(req, res);
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({ teacher_id: 1, teacher_fname: 'John', teacher_lname: 'Doe', allocated_standard: '5', teacher_email: 'john.doe@example.com', school_id: 1, password: '01012000', DOB: new Date('2000-01-01T00:00:00.000Z'), username: 'John@1' });
    });

    it('should handle errors', async () => {
        req.body = { teacher_fname: 'John', teacher_lname: 'Doe', allocated_standard: '5', teacher_email: 'john.doe@example.com', school_id: 1, dob: '01/01/2000' };
        prisma.schoolSchema.findUnique.mockResolvedValue({ school_id: 1 });
        prisma.teacher.create.mockRejectedValue(new Error('Failed to create teacher'));
        await registerTeacher(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: 'Failed to create teacher', details: 'Failed to create teacher' });
    });
});

describe('dashboarddata', () => {
    it('should fetch dashboard data', async () => {
        const mockData = [{ std: '5', no_of_students: '10', pass: '5', fail: '5' }];
        prisma.$queryRaw.mockResolvedValue(mockData);
        const req = {};
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        await dashboarddata(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ graph1: mockData, graph2: mockData, graph3: mockData, graph4: mockData });
    });

    it('should handle errors', async () => {
        prisma.$queryRaw.mockRejectedValue(new Error('Failed to fetch dashboard data'));
        const req = {};
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        await dashboarddata(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch dashboard data', details: 'Failed to fetch dashboard data' });
    });
});

describe('tabulardata', () => {
    it('should fetch tabular data', async () => {
        const mockData = [{ stuID: 1, 'student name': 'John Doe', Standard: '5', '% of student in Academic': 80 }];
        prisma.$queryRaw.mockResolvedValue(mockData);
        const req = {};
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        await tabulardata(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ table1: mockData, table2: mockData, table3: mockData });
    });

    it('should handle errors', async () => {
        prisma.$queryRaw.mockRejectedValue(new Error('Failed to fetch tabular data'));
        const req = {};
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        await tabulardata(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch tabular data', details: 'Failed to fetch tabular data' });
    });
});

describe('declareResult', () => {
    it('should set result status', async () => {
        const req = { body: { isResultOut: true }, adminID: 1 };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        setResultStatus.mockReturnValue(Promise.resolve());
        await declareResult(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ message: 'Result status set to true' });
    });
});


describe('teacherdata', () => {
    it('should fetch teacher data', async () => {
        const mockData = [{ teacher_id: 1, teacher_fname: 'John', teacher_lname: 'Doe', allocated_standard: '5', teacher_email: 'john.doe@example.com', school_id: 1, DOB: new Date(), username: 'john.doe' }];
        prisma.teacher.findMany.mockResolvedValue(mockData);
        const req = { adminID: 1 };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        await teacherdata(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(mockData);
    });

    it('should handle errors', async () => {
        prisma.teacher.findMany.mockRejectedValue(new Error('Failed to fetch teachers'));
        const req = { adminID: 1 };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        await teacherdata(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch teachers', details: 'Failed to fetch teachers' });
    });
});

afterAll(async () => {
    await prisma.$disconnect();
});
