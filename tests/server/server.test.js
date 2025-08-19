const request = require('supertest');
const express = require('express');
let app;

// Reinitialize app and db before each test
beforeEach(() => {
  app = require('../../server/server.js');
  app.use(express.json());
});

describe('Express API Endpoints', () => {
  test('GET /getdata should return empty array initially', async () => {
    const res = await request(app).get('/getdata');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('POST /postdata should add new data', async () => {
    const newItem = { id: '1', name: 'Test Item' };
    const res = await request(app).post('/postdata').send(newItem);
    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual(newItem);
  });

  test('PUT /updatedata/:id should update existing item', async () => {
    const original = { id: '2', name: 'Original' };
    await request(app).post('/postdata').send(original);

    const updated = { id: '2', name: 'Updated' };
    const res = await request(app).put('/updatedata/2').send(updated);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(updated);
  });

  test('DELETE /deletedata/:id should remove item', async () => {
    const item = { id: '3', name: 'To Delete' };
    await request(app).post('/postdata').send(item);

    const res = await request(app).delete('/deletedata/3');
    expect(res.statusCode).toBe(204);

    const getRes = await request(app).get('/getdata');
    expect(getRes.body.find(i => i.id === '3')).toBeUndefined();
  });
});