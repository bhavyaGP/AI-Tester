const request = require('supertest');
const express = require('express');
const app = express();
const routes = require('../../server/routes/routes.js');
const Student = require('../../server/models/students'); // Assuming this is the correct path

app.use(express.json());
app.use('/students', routes);

app.use(function(err, req, res, next) {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

beforeAll(() => {
    // Mock the Student model for testing
    Student.find = jest.fn();
    Student.create = jest.fn();
    Student.findById = jest.fn();
    Student.findByIdAndUpdate = jest.fn();
    Student.findByIdAndDelete = jest.fn();
    Student.countDocuments = jest.fn();
    Student.insertMany = jest.fn();
});

afterAll(() => {
  // Clean up mocks
});

describe('GET /students', () => {
    it('should return a list of students', async () => {
        Student.find.mockResolvedValue([{ name: 'test', surname: 'user'}]);
        const res = await request(app).get('/students');
        expect(res.status).toBe(200);
        expect(res.body).toEqual([{ name: 'test', surname: 'user'}]);
    });
});

describe('POST /students', () => {
    it('should create a new student', async () => {
        Student.create.mockResolvedValue({ name: 'test', surname: 'user'});
        const res = await request(app).post('/students').send({ name: 'test', surname: 'user' });
        expect(res.status).toBe(200);
    });
    it('should handle errors', async () => {
        Student.create.mockRejectedValue(new Error('Test error'));
        const res = await request(app).post('/students').send({ name: 'test', surname: 'user' });
        expect(res.status).toBe(500);
    });
});

describe('GET /students/:id', () => {
    it('should return a single student', async () => {
        Student.findById.mockResolvedValue({ name: 'test', surname: 'user'});
        const res = await request(app).get('/students/123');
        expect(res.status).toBe(200);
    });
    it('should handle errors', async () => {
        Student.findById.mockRejectedValue(new Error('Test error'));
        const res = await request(app).get('/students/123');
        expect(res.status).toBe(500);
    });
});

describe('PUT /students/:id', () => {
    it('should update a student', async () => {
        Student.findByIdAndUpdate.mockResolvedValue({ name: 'test2', surname: 'user2'});
        const res = await request(app).put('/students/123').send({ name: 'test2', surname: 'user2'});
        expect(res.status).toBe(200);
    });
    it('should handle errors', async () => {
        Student.findByIdAndUpdate.mockRejectedValue(new Error('Test error'));
        const res = await request(app).put('/students/123').send({ name: 'test2', surname: 'user2'});
        expect(res.status).toBe(500);
    });
});

describe('DELETE /students/:id', () => {
    it('should delete a student', async () => {
        Student.findByIdAndDelete.mockResolvedValue({ name: 'test', surname: 'user'});
        const res = await request(app).delete('/students/123');
        expect(res.status).toBe(200);
    });
    it('should handle errors', async () => {
        Student.findByIdAndDelete.mockRejectedValue(new Error('Test error'));
        const res = await request(app).delete('/students/123');
        expect(res.status).toBe(500);
    });
});


describe('GET /students/search', () => {
    it('should search students by name or surname', async () => {
        Student.find.mockResolvedValue([{ name: 'test', surname: 'user'}]);
        const res = await request(app).get('/students/search?q=test');
        expect(res.status).toBe(200);
    });
});

describe('GET /students/count', () => {
    it('should return the total number of students', async () => {
        Student.countDocuments.mockResolvedValue(10);
        const res = await request(app).get('/students/count');
        expect(res.status).toBe(200);
        expect(res.body.count).toBe(10);
    });
});

describe('GET /students/recent', () => {
    it('should return recent students', async () => {
        Student.find.mockResolvedValue([{ name: 'test', surname: 'user'}]);
        const res = await request(app).get('/students/recent');
        expect(res.status).toBe(200);
    });
});

describe('POST /students/bulk', () => {
    it('should create students in bulk', async () => {
        Student.insertMany.mockResolvedValue([{ name: 'test', surname: 'user'}]);
        const res = await request(app).post('/students/bulk').send([{ name: 'test', surname: 'user'}]);
        expect(res.status).toBe(200);
    });
    it('should handle errors', async () => {
        Student.insertMany.mockRejectedValue(new Error('Test error'));
        const res = await request(app).post('/students/bulk').send([{ name: 'test', surname: 'user'}]);
        expect(res.status).toBe(500);
    });
    it('should handle invalid input', async () => {
        const res = await request(app).post('/students/bulk').send({});
        expect(res.status).toBe(400);
    });
});

describe('GET /students/surname/:surname', () => {
    it('should find students by exact surname', async () => {
        Student.find.mockResolvedValue([{ name: 'test', surname: 'user'}]);
        const res = await request(app).get('/students/surname/user');
        expect(res.status).toBe(200);
    });
});
