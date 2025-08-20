const request = require('supertest');
const app = require('./app');

describe('GET /getdata', () => {
    it('should return an empty array when the database is empty', async () => {
        const response = await request(app).get('/getdata');
        expect(response.status).toBe(200);
        expect(response.body).toEqual([]);
    });

    it('should return the data in the database', async () => {
        db.push({ id: 1, name: 'test' });
        const response = await request(app).get('/getdata');
        expect(response.status).toBe(200);
        expect(response.body).toEqual([{ id: 1, name: 'test' }]);
    });
});

describe('POST /postdata', () => {
    it('should add new data to the database', async () => {
        const newData = { id: 1, name: 'test' };
        const response = await request(app).post('/postdata').send(newData);
        expect(response.status).toBe(201);
        expect(response.body).toEqual(newData);
        expect(db).toEqual([newData]);
    });
});


describe('DELETE /deletedata/:id', () => {
    it('should delete an existing item', async () => {
        db.push({ id: 1, name: 'test' });
        const response = await request(app).delete('/deletedata/1');
        expect(response.status).toBe(200);
        expect(response.body).toEqual({ message: 'Item deleted successfully' });
        expect(db).toEqual([]);
    });

    it('should return 404 if item is not found', async () => {
        const response = await request(app).delete('/deletedata/1');
        expect(response.status).toBe(404);
        expect(response.body).toEqual({ message: 'Item not found' });
    });
});

describe('PUT /updatedata/:id', () => {
    it('should update an existing item', async () => {
        db.push({ id: 1, name: 'test' });
        const updatedData = { id: 1, name: 'updated' };
        const response = await request(app).put('/updatedata/1').send(updatedData);
        expect(response.status).toBe(200);
        expect(response.body).toEqual(updatedData);
        expect(db).toEqual([updatedData]);
    });

    it('should return 200 even if item is not found and updates db', async () => {
        const updatedData = { id: 1, name: 'updated' };
        const response = await request(app).put('/updatedata/1').send(updatedData);
        expect(response.status).toBe(200);
        expect(response.body).toEqual(updatedData);
        expect(db).toEqual([updatedData]);
    });
});
