const app = require('./index');
const request = require('supertest');
const mongoose = require('mongoose');

beforeAll(async () => {
  await mongoose.connect('mongodb://localhost:27017/testdb', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

afterAll(async () => {
  await mongoose.disconnect();
});

describe('GET /', () => {
  it('should return a 200 status code', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
  });
  it('should return "yes sirr 🫡🫡"', async () => {
    const res = await request(app).get('/');
    expect(res.text).toBe('yes sirr 🫡🫡');
  });
});


describe('CORS Middleware', () => {
  it('should allow requests from localhost:5173', async () => {
    const res = await request(app)
      .get('/')
      .set('Origin', 'http://localhost:5173');
    expect(res.status).toBe(200);
  });
  it('should block requests from other origins', async () => {
    const res = await request(app)
      .get('/')
      .set('Origin', 'http://example.com');
    expect(res.status).not.toBe(200);
  });

});

describe('Server', () => {
  it('should start the server on port 3000 or specified PORT', () => {
    const server = app.listen(3001, () => {
      server.close();
    });
    expect(typeof server.address()).toBe('object');
  });


  it('should handle errors gracefully', async () => {
      const res = await request(app).get('/api/nonexistent');
      expect(res.status).toBe(404);
  });


});
