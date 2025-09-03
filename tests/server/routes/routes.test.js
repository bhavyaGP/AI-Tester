const request = require('supertest');
const express = require('express');
const app = express();
const routes = require('../../server/routes/routes.js');
const Student = require('../../server/models/students'); // Assuming this exists

app.use('/api/students', routes);

// Mock Student model for testing
jest.mock('../../server/models/students');

describe('Student Routes', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /', () => {
    it('should get all students', async () => {
      const mockStudents = [{ name: 'test' }, { name: 'test2' }];
      Student.find.mockResolvedValue(mockStudents);
      const res = await request(app).get('/api/students/');
      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockStudents);
    });
    it('should handle errors', async () => {
      Student.find.mockRejectedValue(new Error('Failed'));
      const res = await request(app).get('/api/students/');
      expect(res.status).toBe(500);
      expect(res.body).toEqual({error: 'Failed'});
    });
  });


  describe('POST /', () => {
    it('should create a student', async () => {
      const mockStudent = { name: 'test', surname: 'user' };
      Student.create.mockResolvedValue(mockStudent);
      const res = await request(app).post('/api/students/').send(mockStudent);
      expect(res.status).toBe(200); // or 201
      expect(Student.create).toHaveBeenCalledWith(mockStudent);
    });
    it('should handle validation errors', async () => {
      const res = await request(app).post('/api/students/').send({});
      expect(res.status).toBe(400); // Assuming validation middleware returns 400
    });
    it('should handle database errors', async () => {
      Student.create.mockRejectedValue(new Error('Failed'));
      const res = await request(app).post('/api/students/').send({name: 'test', surname: 'user'});
      expect(res.status).toBe(500);
      expect(res.body).toEqual({error: 'Failed'});
    });
  });

  describe('GET /:id', () => {
    it('should get a student by ID', async () => {
      const mockStudent = { _id: '1', name: 'test' };
      Student.findById.mockResolvedValue(mockStudent);
      const res = await request(app).get('/api/students/1');
      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockStudent);
    });
    it('should handle not found', async () => {
      Student.findById.mockResolvedValue(null);
      const res = await request(app).get('/api/students/1');
      expect(res.status).toBe(404); // Or handle differently based on your implementation
    });
    it('should handle database errors', async () => {
      Student.findById.mockRejectedValue(new Error('Failed'));
      const res = await request(app).get('/api/students/1');
      expect(res.status).toBe(500);
      expect(res.body).toEqual({error: 'Failed'});
    });
  });

  describe('PUT /:id', () => {
    it('should update a student', async () => {
      const mockStudent = { _id: '1', name: 'test2' };
      Student.findByIdAndUpdate.mockResolvedValue(mockStudent);
      const res = await request(app).put('/api/students/1').send({ name: 'test2' });
      expect(res.status).toBe(200);
      expect(Student.findByIdAndUpdate).toHaveBeenCalledWith('1', { name: 'test2' }, { new: true });
    });
    it('should handle validation errors', async () => {
      const res = await request(app).put('/api/students/1').send({});
      expect(res.status).toBe(400); // Assuming validation middleware returns 400
    });
    it('should handle not found', async () => {
      Student.findByIdAndUpdate.mockResolvedValue(null);
      const res = await request(app).put('/api/students/1').send({ name: 'test2' });
      expect(res.status).toBe(404); // Or handle differently based on your implementation
    });
    it('should handle database errors', async () => {
      Student.findByIdAndUpdate.mockRejectedValue(new Error('Failed'));
      const res = await request(app).put('/api/students/1').send({ name: 'test2' });
      expect(res.status).toBe(500);
      expect(res.body).toEqual({error: 'Failed'});
    });
  });

  describe('DELETE /:id', () => {
    it('should delete a student', async () => {
      Student.findByIdAndDelete.mockResolvedValue({});
      const res = await request(app).delete('/api/students/1');
      expect(res.status).toBe(204); // Or 200 depending on implementation
      expect(Student.findByIdAndDelete).toHaveBeenCalledWith('1');
    });
    it('should handle not found', async () => {
      Student.findByIdAndDelete.mockResolvedValue(null);
      const res = await request(app).delete('/api/students/1');
      expect(res.status).toBe(404); // Or handle differently based on your implementation
    });
    it('should handle database errors', async () => {
      Student.findByIdAndDelete.mockRejectedValue(new Error('Failed'));
      const res = await request(app).delete('/api/students/1');
      expect(res.status).toBe(500);
      expect(res.body).toEqual({error: 'Failed'});
    });
  });

  describe('GET /search', () => {
    it('should search students', async () => {
      const mockStudents = [{ name: 'test' }];
      Student.find.mockResolvedValue(mockStudents);
      const res = await request(app).get('/api/students/search?q=test');
      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockStudents);
    });
    it('should handle errors', async () => {
      Student.find.mockRejectedValue(new Error('Failed'));
      const res = await request(app).get('/api/students/search?q=test');
      expect(res.status).toBe(500);
      expect(res.body).toEqual({error: 'Failed'});
    });
  });

  describe('GET /count', () => {
    it('should get student count', async () => {
      Student.countDocuments.mockResolvedValue(10);
      const res = await request(app).get('/api/students/count');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ count: 10 });
    });
    it('should handle errors', async () => {
      Student.countDocuments.mockRejectedValue(new Error('Failed'));
      const res = await request(app).get('/api/students/count');
      expect(res.status).toBe(500);
      expect(res.body).toEqual({error: 'Failed'});
    });
  });

  describe('GET /recent', () => {
    it('should get recent students', async () => {
      const mockStudents = [{ name: 'test' }];
      Student.find.mockResolvedValue(mockStudents);
      const res = await request(app).get('/api/students/recent');
      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockStudents);
    });
    it('should handle errors', async () => {
      Student.find.mockRejectedValue(new Error('Failed'));
      const res = await request(app).get('/api/students/recent');
      expect(res.status).toBe(500);
      expect(res.body).toEqual({error: 'Failed'});
    });
  });

  describe('POST /bulk', () => {
    it('should create students in bulk', async () => {
      const mockStudents = [{ name: 'test' }, { name: 'test2' }];
      Student.insertMany.mockResolvedValue(mockStudents);
      const res = await request(app).post('/api/students/bulk').send(mockStudents);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ inserted: 2 });
    });
    it('should handle validation errors', async () => {
      const res = await request(app).post('/api/students/bulk').send([{}]);
      expect(res.status).toBe(400); // Assuming validation middleware returns 400
    });
    it('should handle database errors', async () => {
      Student.insertMany.mockRejectedValue(new Error('Failed'));
      const res = await request(app).post('/api/students/bulk').send([{name: 'test'}, {name: 'test2'}]);
      expect(res.status).toBe(500);
      expect(res.body).toEqual({error: 'Failed'});
    });
  });

  describe('GET /surname/:surname', () => {
    it('should find students by surname', async () => {
      const mockStudents = [{ surname: 'test' }];
      Student.find.mockResolvedValue(mockStudents);
      const res = await request(app).get('/api/students/surname/test');
      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockStudents);
    });
    it('should handle errors', async () => {
      Student.find.mockRejectedValue(new Error('Failed'));
      const res = await request(app).get('/api/students/surname/test');
      expect(res.status).toBe(500);
      expect(res.body).toEqual({error: 'Failed'});
    });
  });

  it('should export advanced routes', () => {
    expect(routes.advanced).toBeDefined();
  });
});
