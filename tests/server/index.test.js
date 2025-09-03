const request = require('supertest');
const app = require('./app');

describe('POST /items', () => {
    test('should create a new item', async () => {
        const res = await request(app).post('/items').send({ name: 'Item 1' });
        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('id');
        expect(res.body.name).toBe('Item 1');
    });
});

describe('GET /items', () => {
    test('should return all items', async () => {
        await request(app).post('/items').send({ name: 'Item 1' });
        const res = await request(app).get('/items');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });
});

describe('GET /items/:id', () => {
    test('should return an item by ID', async () => {
        const postRes = await request(app).post('/items').send({ name: 'Item 1' });
        const itemId = postRes.body.id;
        const res = await request(app).get(`/items/${itemId}`);
        expect(res.status).toBe(200);
        expect(res.body.id).toBe(itemId);
        expect(res.body.name).toBe('Item 1');
    });
    test('should return 404 if item not found', async () => {
        const res = await request(app).get('/items/999');
        expect(res.status).toBe(404);
        expect(res.body.message).toBe('Item not found');
    });
});

describe('PUT /items/:id', () => {
    test('should update an item', async () => {
        const postRes = await request(app).post('/items').send({ name: 'Item 1' });
        const itemId = postRes.body.id;
        const res = await request(app).put(`/items/${itemId}`).send({ name: 'Updated Item' });
        expect(res.status).toBe(200);
        expect(res.body.id).toBe(itemId);
        expect(res.body.name).toBe('Updated Item');
    });
    test('should return 404 if item not found', async () => {
        const res = await request(app).put('/items/999').send({ name: 'Updated Item' });
        expect(res.status).toBe(404);
        expect(res.body.message).toBe('Item not found');
    });
});

describe('DELETE /items/:id', () => {
    test('should delete an item', async () => {
        const postRes = await request(app).post('/items').send({ name: 'Item 1' });
        const itemId = postRes.body.id;
        const res = await request(app).delete(`/items/${itemId}`);
        expect(res.status).toBe(200);
        expect(res.body.id).toBe(itemId);
        expect(res.body.name).toBe('Item 1');
    });
    test('should return 404 if item not found', async () => {
        const res = await request(app).delete('/items/999');
        expect(res.status).toBe(404);
        expect(res.body.message).toBe('Item not found');
    });
});
