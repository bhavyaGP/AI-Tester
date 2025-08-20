const request = require('supertest');
const app = require('./app');

describe('GET /getdata', () => {
    it('should return an empty array if the database is empty', async () => {
        const res = await request(app).get('/getdata');
        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
    });
    it('should return the data in the database', async () => {
        db.push({id:1, name: 'test'});
        const res = await request(app).get('/getdata');
        expect(res.status).toBe(200);
        expect(res.body).toEqual([{id:1, name: 'test'}]);
    });
});

describe('POST /postdata', () => {
    it('should add new data to the database', async () => {
        const res = await request(app).post('/postdata').send({ id: 2, name: 'test2' });
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ id: 2, name: 'test2' });
        expect(db).toEqual([{ id: 2, name: 'test2' }]);
    });
});

describe('DELETE /deletedata/:id', () => {
    it('should delete data from the database', async () => {
        db.push({ id: 3, name: 'test3' });
        const res = await request(app).delete('/deletedata/3');
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ message: 'Deleted' });
        expect(db).toEqual([]);
    });
    it('should handle deleting non-existent data', async () => {
        const res = await request(app).delete('/deletedata/4');
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ message: 'Deleted' });
        expect(db).toEqual([]);
    });
});

describe('PUT /updatedata/:id', () => {
    it('should update data in the database', async () => {
        db.push({ id: 4, name: 'test4' });
        const res = await request(app).put('/updatedata/4').send({ name: 'updated' });
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ name: 'updated' });
        expect(db).toEqual([{ id: 4, name: 'updated' }]);
    });
    it('should handle updating non-existent data', async () => {
        const res = await request(app).put('/updatedata/5').send({ name: 'test5' });
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ name: 'test5' });
        expect(db).toEqual([{ id: 4, name: 'updated' }]);
    });

});
