const request = require('supertest');
const app = require('./server');
let db = []; //Simulate database

describe('GET /getdata', () => {
    it('should return an empty array when the database is empty', async () => {
        const response = await request(app).get('/getdata');
        expect(response.status).toBe(200);
        expect(response.body).toEqual([]);
    });
    it('should return the current database content', async () => {
        db.push({id: 1, name: 'test'});
        const response = await request(app).get('/getdata');
        expect(response.status).toBe(200);
        expect(response.body).toEqual([{id: 1, name: 'test'}]);
    });
});

describe('POST /postdata', () => {
    it('should add new data to the database and return the new data', async () => {
        const newData = { id: 1, name: 'test' };
        const response = await request(app).post('/postdata').send(newData);
        expect(response.status).toBe(201);
        expect(response.body).toEqual(newData);
        expect(db).toEqual([newData]);
    });
    it('should handle invalid data', async () => {
        const newData = { name: 'test' };
        const response = await request(app).post('/postdata').send(newData);
        expect(response.status).toBe(400);
    });
});


describe('DELETE /deletedata/:id', () => {
    it('should delete data by ID and return a success message', async () => {
        db.push({ id: 1, name: 'test' });
        const response = await request(app).delete('/deletedata/1');
        expect(response.status).toBe(200);
        expect(response.body).toEqual({ message: 'Deleted' });
        expect(db).toEqual([]);
    });
    it('should return 404 if item is not found', async () => {
        const response = await request(app).delete('/deletedata/1');
        expect(response.status).toBe(404);
        expect(response.body).toEqual({ message: 'Item not found' });
    });
    it('should handle invalid ID', async () => {
        const response = await request(app).delete('/deletedata/abc');
        expect(response.status).toBe(400);
    });
});

describe('PUT /updatedata/:id', () => {
    it('should update data by ID and return the updated data', async () => {
        db.push({ id: 1, name: 'test' });
        const updatedData = { id: 1, name: 'updated' };
        const response = await request(app).put('/updatedata/1').send(updatedData);
        expect(response.status).toBe(200);
        expect(response.body).toEqual(updatedData);
        expect(db).toEqual([updatedData]);
    });
    it('should return 404 if item is not found', async () => {
        const updatedData = { id: 1, name: 'updated' };
        const response = await request(app).put('/updatedata/1').send(updatedData);
        expect(response.status).toBe(404);
        expect(response.body).toEqual({ message: 'Item not found' });
    });
    it('should handle invalid ID', async () => {
        const updatedData = { id: 1, name: 'updated' };
        const response = await request(app).put('/updatedata/abc').send(updatedData);
        expect(response.status).toBe(400);
    });
    it('should handle invalid data', async () => {
        db.push({ id: 1, name: 'test' });
        const updatedData = { name: 'updated' };
        const response = await request(app).put('/updatedata/1').send(updatedData);
        expect(response.status).toBe(400);
    });
});

afterEach(() => {
    db = [];
});
