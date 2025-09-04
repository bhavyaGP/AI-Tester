const request = require('supertest');
const app = require('../../server/index.js');

describe('Server', () => {
  afterAll((done) => {
    app.close();
    done();
  });

  test('Server listens on port 3000', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
  });

  test('GET /api/students returns 200', async () => {
    const res = await request(app).get('/api/students');
    expect(res.status).toBe(200);
  });


  test('POST /api/students returns 201', async () => {
    const res = await request(app).post('/api/students').send({name: 'test', age: 20});
    expect(res.status).toBe(201);
  });

  test('POST /api/students with missing data returns 400', async () => {
    const res = await request(app).post('/api/students').send({});
    expect(res.status).toBe(400);
  });

  test('PUT /api/students/:id returns 200', async () => {
      const postRes = await request(app).post('/api/students').send({name: 'test', age: 20});
      const studentId = postRes.body._id;
      const res = await request(app).put(`/api/students/${studentId}`).send({name: 'updated', age: 25});
      expect(res.status).toBe(200);
  });


  test('PUT /api/students/:id with missing data returns 400', async () => {
    const res = await request(app).put('/api/students/123').send({});
    expect(res.status).toBe(400);
  });

  test('DELETE /api/students/:id returns 200', async () => {
      const postRes = await request(app).post('/api/students').send({name: 'test', age: 20});
      const studentId = postRes.body._id;
      const res = await request(app).delete(`/api/students/${studentId}`);
      expect(res.status).toBe(200);
  });

  test('DELETE /api/students/:id with invalid id returns 400', async () => {
    const res = await request(app).delete('/api/students/invalidId');
    expect(res.status).toBe(400);
  });

  test('Handles invalid routes', async () => {
    const res = await request(app).get('/invalidRoute');
    expect(res.status).toBe(404);
  });

});
