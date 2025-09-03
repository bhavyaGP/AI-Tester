const request = require('supertest');
const app = require('../../server/index.js');

describe('Server', () => {
  afterAll(() => {
    server.close();
  });

  let server;
  beforeAll(() => {
    server = app.listen(0);
  });


  test('should listen on a port', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
  });

  test('should handle /api/students routes', async () => {
    const res = await request(app).get('/api/students');
    expect(res.statusCode).toBe(200);
  });


  test('should return 404 for non-existent route', async () => {
    const res = await request(app).get('/api/nonexistent');
    expect(res.statusCode).toBe(404);
  });

  test('should handle JSON requests', async () => {
    const res = await request(app).post('/api/students').send({ name: 'test' });
    expect(res.statusCode).toBe(200);
  });

  test('should handle CORS requests', async () => {
    const res = await request(app).get('/api/students').set('Origin', 'http://example.com');
    expect(res.statusCode).toBe(200);
  });


  test('should handle invalid JSON', async () => {
    const res = await request(app).post('/api/students').send('invalid json');
    expect(res.statusCode).toBe(400);
  });

});
