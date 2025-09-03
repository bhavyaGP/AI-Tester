const request = require('supertest');
const express = require('express');
const app = express();
const routes = require('../../server/routes/routes.js');
app.use('/', routes);

describe('Student Routes', () => {
  let server;
  beforeEach(() => {
    server = app.listen(0);
  });
  afterEach(() => {
    server.close();
  });

  describe('GET /', () => {
    it('should return a list of students', async () => {
      const res = await request(server).get('/');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
    it('should handle errors gracefully', async () => {
      const originalGetStudents = routes.getStudents;
      routes.getStudents = () => { throw new Error('Database error'); };
      const res = await request(server).get('/');
      expect(res.status).toBe(500);
      routes.getStudents = originalGetStudents;
    });
  });

  describe('POST /', () => {
    it('should create a new student', async () => {
      const res = await request(server).post('/').send({ name: 'Test', id: 1 });
      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Test');
    });
    it('should handle invalid input', async () => {
      const res = await request(server).post('/').send({});
      expect(res.status).toBe(400);
    });
    it('should handle errors gracefully', async () => {
      const originalCreateStudent = routes.createStudent;
      routes.createStudent = () => { throw new Error('Database error') };
      const res = await request(server).post('/').send({ name: 'Test', id: 1 });
      expect(res.status).toBe(500);
      routes.createStudent = originalCreateStudent;
    });

  });

  describe('GET /:id', () => {
    it('should return a single student', async () => {
      const res = await request(server).get('/1');
      expect(res.status).toBe(200);
      expect(typeof res.body).toBe('object');
    });
    it('should handle non existent student', async () => {
      const res = await request(server).get('/999');
      expect(res.status).toBe(404);
    });
    it('should handle errors gracefully', async () => {
      const originalGetStudent = routes.getStudent;
      routes.getStudent = () => { throw new Error('Database error') };
      const res = await request(server).get('/1');
      expect(res.status).toBe(500);
      routes.getStudent = originalGetStudent;
    });
  });


  describe('PUT /:id', () => {
    it('should update a student', async () => {
      const res = await request(server).put('/1').send({ name: 'Updated Test' });
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated Test');
    });
    it('should handle invalid input', async () => {
      const res = await request(server).put('/1').send({});
      expect(res.status).toBe(400);
    });
    it('should handle non existent student', async () => {
      const res = await request(server).put('/999').send({ name: 'Updated Test' });
      expect(res.status).toBe(404);
    });
    it('should handle errors gracefully', async () => {
      const originalEditStudent = routes.editStudent;
      routes.editStudent = () => { throw new Error('Database error') };
      const res = await request(server).put('/1').send({ name: 'Updated Test' });
      expect(res.status).toBe(500);
      routes.editStudent = originalEditStudent;
    });
  });

  describe('DELETE /:id', () => {
    it('should delete a student', async () => {
      const res = await request(server).delete('/1');
      expect(res.status).toBe(200);
    });
    it('should handle non existent student', async () => {
      const res = await request(server).delete('/999');
      expect(res.status).toBe(404);
    });
    it('should handle errors gracefully', async () => {
      const originalDeleteStudent = routes.deleteStudent;
      routes.deleteStudent = () => { throw new Error('Database error') };
      const res = await request(server).delete('/1');
      expect(res.status).toBe(500);
      routes.deleteStudent = originalDeleteStudent;
    });
  });
});
