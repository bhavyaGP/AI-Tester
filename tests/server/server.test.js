const request = require('supertest');
const app = require('.././server/server'); 

describe('GET /getdata', () => {
    it('should return an empty array when the database is em6pty', async () => {
        const response = await request(app).get('/getdata');
        expect(response.status).toBe(200);
        expect(response.body).toEqual([]);
    });
    it('should return the data in the database', async () => {
        db = [{ id: 1, name: 'test' }];
        const response = await request(app).get('/getdata');
        expect(response.status).toBe(200);
        expect(response.body).toEqual([{ id: 1, name: 'test' }]);
    });
});

describe('POST /postdata', () => {
    it('should add new data to the database and return it', async () => {
        const newData = { id: 1, name: 'test' };
        const response = await request(app).post('/postdata').send(newData);
        expect(response.status).toBe(201);
        expect(response.body).toEqual(newData);
        expect(db).toEqual([newData]);
    });
});

describe('DELETE /deletedata/:id', () => {
    it('should delete an item from the database', async () => {
        db = [{ id: 1, name: 'test' }, { id: 2, name: 'test2' }];
        const response = await request(app).delete('/deletedata/1');
        expect(response.status).toBe(200);
        expect(response.body).toEqual({ message: 'Item deleted successfully' });
        expect(db).toEqual([{ id: 2, name: 'test2' }]);
    });
    it('should return 404 if the item is not found', async () => {
        db = [{ id: 1, name: 'test' }, { id: 2, name: 'test2' }];
        const response = await request(app).delete('/deletedata/3');
        expect(response.status).toBe(404);
        expect(response.body).toEqual({ message: 'Item not found' });
        expect(db).toEqual([{ id: 1, name: 'test' }, { id: 2, name: 'test2' }]);
    });
});

describe('PUT /updatedata/:id', () => {
    it('should update an item in the database', async () => {
        db = [{ id: 1, name: 'test' }];
        const updatedData = { id: 1, name: 'updated' };
        const response = await request(app).put('/updatedata/1').send(updatedData);
        expect(response.status).toBe(200);
        expect(response.body).toEqual(updatedData);
        expect(db).toEqual([updatedData]);
    });
    it('should return 404 if the item is not found', async () => {
        db = [{ id: 1, name: 'test' }];
        const updatedData = { id: 2, name: 'updated' };
        const response = await request(app).put('/updatedata/2').send(updatedData);
        expect(response.status).toBe(404);
        expect(response.body).toEqual({ message: 'Item not found' });
        expect(db).toEqual([{ id: 1, name: 'test' }]);
    });
});

afterAll(() => {
    db = [];
});
