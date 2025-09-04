const request = require('supertest');
const express = require('express');
const app = express();
const routes = require('../../server/routes/routes.js');
app.use('/students', routes);

describe('Student Routes', () => {
  let server;
  beforeEach(() => {
    server = app.listen(0);
  });
  afterEach(() => {
    server.close();
  });

  describe('GET /students', () => {
    it('should return a list of students', async () => {
      const res = await request(server).get('/students');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
    it('should handle errors gracefully', async () => {
      const originalGetStudents = routes.getStudents;
      routes.getStudents = () => { throw new Error('Database error'); };
      const res = await request(server).get('/students');
      expect(res.status).toBe(500);
      routes.getStudents = originalGetStudents;
    });
  });

  describe('POST /students', () => {
    it('should create a new student', async () => {
      const res = await request(server).post('/students').send({ name: 'Test Student', id: 1 });
      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Test Student');
    });
    it('should handle validation errors', async () => {
      const res = await request(server).post('/students').send({});
      expect(res.status).toBe(400);
    });
  });

  describe('GET /students/:id', () => {
    it('should return a single student', async () => {
      const res = await request(server).get('/students/1');
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(1);
    });
    it('should handle not found', async () => {
      const res = await request(server).get('/students/999');
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /students/:id', () => {
    it('should update a student', async () => {
      const res = await request(server).put('/students/1').send({ name: 'Updated Student' });
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated Student');
    });
    it('should handle not found', async () => {
      const res = await request(server).put('/students/999').send({ name: 'Updated Student' });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /students/:id', () => {
    it('should delete a student', async () => {
      const res = await request(server).delete('/students/1');
      expect(res.status).toBe(204);
    });
    it('should handle not found', async () => {
      const res = await request(server).delete('/students/999');
      expect(res.status).toBe(404);
    });
  });
});
