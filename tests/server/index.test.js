const request = require('supertest');
const app = require('../../server/index.js');

describe('POST /items', () => {
  it('should create a new item', async () => {
    const res = await request(app).post('/items').send({ name: 'Item 1' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.name).toBe('Item 1');
  });
});

describe('GET /items', () => {
  it('should return all items', async () => {
    await request(app).post('/items').send({ name: 'Item 1' });
    const res = await request(app).get('/items');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
  it('should return an empty array if no items exist', async () => {
    const res = await request(app).get('/items');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe('GET /items/:id', () => {
  it('should return an item by ID', async () => {
    const postRes = await request(app).post('/items').send({ name: 'Item 1' });
    const itemId = postRes.body.id;
    const res = await request(app).get(`/items/${itemId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(itemId);
    expect(res.body.name).toBe('Item 1');
  });
  it('should return 404 if item not found', async () => {
    const res = await request(app).get('/items/999');
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Item not found');
  });
});

describe('PUT /items/:id', () => {
  it('should update an item by ID', async () => {
    const postRes = await request(app).post('/items').send({ name: 'Item 1' });
    const itemId = postRes.body.id;
    const res = await request(app).put(`/items/${itemId}`).send({ name: 'Updated Item' });
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(itemId);
    expect(res.body.name).toBe('Updated Item');
  });
  it('should return 404 if item not found', async () => {
    const res = await request(app).put('/items/999').send({ name: 'Updated Item' });
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Item not found');
  });
});

describe('DELETE /items/:id', () => {
  it('should delete an item by ID', async () => {
    const postRes = await request(app).post('/items').send({ name: 'Item 1' });
    const itemId = postRes.body.id;
    const res = await request(app).delete(`/items/${itemId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(itemId);
    expect(res.body.name).toBe('Item 1');
  });
  it('should return 404 if item not found', async () => {
    const res = await request(app).delete('/items/999');
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Item not found');
  });
});
