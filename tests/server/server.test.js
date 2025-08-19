const request = require('supertest');
const app = require('./your-file-name'); // Replace your-file-name

describe('GET /getdata', () => {
    it('should return an empty array when the database is empty', async () => {
        const res = await request(app).get('/getdata');
        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
    });
    it('should return the data in the database', async () => {
        db.push({ id: 1, name: 'test' });
        const res = await request(app).get('/getdata');
        expect(res.status).toBe(200);
        expect(res.body).toEqual([{ id: 1, name: 'test' }]);
    });
});

describe('POST /postdata', () => {
    it('should add new data to the database and return the new data', async () => {
        const res = await request(app).post('/postdata').send({ id: 1, name: 'test' });
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ id: 1, name: 'test' });
        expect(db).toEqual([{ id: 1, name: 'test' }]);
    });
});

describe('DELETE /deletedata/:id', () => {
    it('should delete data from the database', async () => {
        db.push({ id: 1, name: 'test' });
        const res = await request(app).delete('/deletedata/1');
        expect(res.status).toBe(200);
        expect(db).toEqual([]);
    });
    it('should not throw error if id does not exist', async () => {
        const res = await request(app).delete('/deletedata/1');
        expect(res.status).toBe(200);
        expect(db).toEqual([]);
    })
});

describe('PUT /updatedata/:id', () => {
    it('should update existing data in the database and return the updated data', async () => {
        db.push({ id: 1, name: 'test' });
        const res = await request(app).put('/updatedata/1').send({ name: 'updated' });
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ name: 'updated' });
        expect(db).toEqual([{ id: 1, name: 'updated' }]);
    });
    it('should return 200 status code if id does not exist', async () => {
        const res = await request(app).put('/updatedata/2').send({ name: 'updated' });
        expect(res.status).toBe(200);
        expect(db).toEqual([{id:1, name: 'updated'}]);
    })
});
