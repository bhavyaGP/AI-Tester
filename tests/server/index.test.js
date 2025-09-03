const supertest = require('supertest');
const app = require('../../server/index.js');
const request = supertest(app);

describe('Server', () => {
  afterAll(async () => {
    await new Promise((resolve) => setTimeout(resolve, 500));
  });

  test('GET / responds with 200', async () => {
    const response = await request.get('/');
    expect(response.status).toBe(200);
    expect(response.text).toBe('Meow');
  });

  test('GET /api/admin should respond with 200', async () => {
    const response = await request.get('/api/admin');
    expect(response.status).toBe(200);
  });


  test('GET /api/teacher should respond with 200', async () => {
    const response = await request.get('/api/teacher');
    expect(response.status).toBe(200);
  });

  test('Server listens on port 3000', () => {
    const port = app.address().port;
    expect(port).toBe(3000);
  });

  test('Server uses correct view engine', () => {
    expect(app.get('view engine')).toBe('ejs');
  });

  test('Server uses correct views directory', () => {
    expect(app.get('views')).toBe(path.resolve("./views"));
  });

  test('Server uses cors middleware', () => {
    expect(app._router.stack.some(layer => layer.handle.name === 'cors')).toBe(true);
  });

  test('Server uses morgan middleware', () => {
    expect(app._router.stack.some(layer => layer.handle.name === 'morgan')).toBe(true);
  });

  test('Server uses express.json middleware', () => {
    expect(app._router.stack.some(layer => layer.handle.name === 'json')).toBe(true);
  });

  test('Server uses express.urlencoded middleware', () => {
    expect(app._router.stack.some(layer => layer.handle.name === 'urlencoded')).toBe(true);
  });

  test('Server uses cookie-parser middleware', () => {
    expect(app._router.stack.some(layer => layer.handle.name === 'cookieParser')).toBe(true);
  });


  test('handles 404', async () => {
    const res = await request.get('/nonexistent');
    expect(res.status).not.toBe(200);

  });
});
