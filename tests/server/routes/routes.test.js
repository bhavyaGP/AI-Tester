const request = require('supertest');
const express = require('express');
const app = express();
const routes = require('../../server/routes/routes.js');
const Student = require('../../server/models/students'); // Assuming this model exists

app.use(express.json());
app.use('/', routes);

// Mock Student model for testing
jest.mock('../../server/models/students');

describe('Student Routes', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /', () => {
    it('should return a list of students', async () => {
      const mockStudents = [{ name: 'Test', surname: 'User' }];
      Student.find.mockResolvedValue(mockStudents);
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockStudents);
    });
    it('should handle errors gracefully', async () => {
      Student.find.mockRejectedValue(new Error('DB error'));
      const res = await request(app).get('/');
      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('POST /', () => {
    it('should create a new student', async () => {
      const newStudent = { name: 'Test', surname: 'User' };
      Student.create.mockResolvedValue(newStudent);
      const res = await request(app).post('/').send(newStudent);
      expect(res.status).toBe(200);
      expect(res.body).toEqual(newStudent);
    });
    it('should handle errors gracefully', async () => {
      Student.create.mockRejectedValue(new Error('DB error'));
      const res = await request(app).post('/').send({});
      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('error');
    });
  });


  describe('GET /:id', () => {
    it('should return a single student', async () => {
      const student = { _id: '1', name: 'Test', surname: 'User' };
      Student.findById.mockResolvedValue(student);
      const res = await request(app).get('/1');
      expect(res.status).toBe(200);
      expect(res.body).toEqual(student);
    });
    it('should handle not found', async () => {
      Student.findById.mockResolvedValue(null);
      const res = await request(app).get('/1');
      expect(res.status).toBe(404); // Or handle appropriately
    });
    it('should handle errors gracefully', async () => {
      Student.findById.mockRejectedValue(new Error('DB error'));
      const res = await request(app).get('/1');
      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('PUT /:id', () => {
    it('should update a student', async () => {
      const updatedStudent = { _id: '1', name: 'Updated', surname: 'User' };
      Student.findByIdAndUpdate.mockResolvedValue(updatedStudent);
      const res = await request(app).put('/1').send(updatedStudent);
      expect(res.status).toBe(200);
      expect(res.body).toEqual(updatedStudent);
    });
    it('should handle errors gracefully', async () => {
      Student.findByIdAndUpdate.mockRejectedValue(new Error('DB error'));
      const res = await request(app).put('/1').send({});
      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('DELETE /:id', () => {
    it('should delete a student', async () => {
      Student.findByIdAndDelete.mockResolvedValue({});
      const res = await request(app).delete('/1');
      expect(res.status).toBe(204); // Or handle appropriately
    });
    it('should handle errors gracefully', async () => {
      Student.findByIdAndDelete.mockRejectedValue(new Error('DB error'));
      const res = await request(app).delete('/1');
      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('GET /search', () => {
    it('should search students by name or surname', async () => {
      const mockStudents = [{ name: 'Test', surname: 'User' }];
      Student.find.mockResolvedValue(mockStudents);
      const res = await request(app).get('/search?q=Test');
      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockStudents);
    });
    it('should handle errors gracefully', async () => {
      Student.find.mockRejectedValue(new Error('DB error'));
      const res = await request(app).get('/search?q=Test');
      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('GET /count', () => {
    it('should return the total number of students', async () => {
      Student.countDocuments.mockResolvedValue(10);
      const res = await request(app).get('/count');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ count: 10 });
    });
    it('should handle errors gracefully', async () => {
      Student.countDocuments.mockRejectedValue(new Error('DB error'));
      const res = await request(app).get('/count');
      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('GET /recent', () => {
    it('should return recent students', async () => {
      const mockStudents = [{ name: 'Test', surname: 'User' }];
      Student.find.mockResolvedValue(mockStudents);
      const res = await request(app).get('/recent');
      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockStudents);
    });
    it('should handle errors gracefully', async () => {
      Student.find.mockRejectedValue(new Error('DB error'));
      const res = await request(app).get('/recent');
      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('POST /bulk', () => {
    it('should create students in bulk', async () => {
      const students = [{ name: 'Test1', surname: 'User1' }, { name: 'Test2', surname: 'User2' }];
      Student.insertMany.mockResolvedValue(students);
      const res = await request(app).post('/bulk').send(students);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ inserted: 2 });
    });
    it('should handle invalid input', async () => {
      const res = await request(app).post('/bulk').send({});
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
    it('should handle errors gracefully', async () => {
      Student.insertMany.mockRejectedValue(new Error('DB error'));
      const res = await request(app).post('/bulk').send([]);
      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('GET /surname/:surname', () => {
    it('should find students by surname', async () => {
      const mockStudents = [{ name: 'Test', surname: 'User' }];
      Student.find.mockResolvedValue(mockStudents);
      const res = await request(app).get('/surname/User');
      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockStudents);
    });
    it('should handle errors gracefully', async () => {
      Student.find.mockRejectedValue(new Error('DB error'));
      const res = await request(app).get('/surname/User');
      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('error');
    });
  });

  it('should export advanced routes', () => {
    expect(routes.advanced).toBeDefined();
  });
});
