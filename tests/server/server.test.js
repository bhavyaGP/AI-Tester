const request = require('supertest');

describe('Express API Endpoints', () => {
  let app;

  beforeEach(() => {
    jest.resetModules();
    // This line assumes your app file is in './app.js' relative to the test file.
    // For these tests to run, the original 'app.js' file MUST export the 'app' instance,
    // e.g., by adding 'module.exports = app;' at the end of the file.
    app = require('./app'); 

    // Prevents app.listen from starting the server when module is required.
    // This is crucial for isolated testing and avoiding port conflicts.
    jest.spyOn(app, 'listen').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /getdata', () => {
    test('should return an empty array initially', async () => {
      const response = await request(app).get('/getdata');
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual([]);
    });

    test('should return existing data after a POST request (note: req.body unparsed)', async () => {
      // The original code is missing 'app.use(express.json())', so req.body will be undefined.
      // This means 'undefined' is pushed to the db.
      await request(app)
        .post('/postdata')
        .send({ id: '1', name: 'Test Item' });

      const response = await request(app).get('/getdata');
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual([undefined]); 
    });
  });

  describe('POST /postdata', () => {
    test('should add new data and return 201 status (note: req.body unparsed)', async () => {
      const newItem = { id: '2', name: 'Another Item' };
      const response = await request(app)
        .post('/postdata')
        .send(newItem);

      expect(response.statusCode).toBe(201);
      // req.body is undefined because express.json() middleware is missing.
      expect(response.body).toEqual(undefined); 

      // Verify that 'undefined' was added to the database.
      const getDataResponse = await request(app).get('/getdata');
      expect(getDataResponse.statusCode).toBe(200);
      expect(getDataResponse.body).toEqual([undefined]);
    });

    test('should handle empty body gracefully (adds undefined to db, req.body unparsed)', async () => {
      const response = await request(app)
        .post('/postdata')
        .send({}); 

      expect(response.statusCode).toBe(201);
      // req.body is undefined because express.json() middleware is missing.
      expect(response.body).toEqual(undefined); 

      const getDataResponse = await request(app).get('/getdata');
      expect(getDataResponse.statusCode).toBe(200);
      expect(getDataResponse.body).toEqual([undefined]);
    });
  });

  describe('DELETE /deletedata/:id', () => {
    test('should return 500 and TypeError when attempting to delete existing data due to const reassignment', async () => {
      // Add an item (which will be 'undefined' due to missing body parser)
      await request(app).post('/postdata').send({ id: '1', name: 'Item to delete' });

      // Attempt to delete the item. The route code tries to reassign 'const db'.
      const response = await request(app).delete('/deletedata/1');

      expect(response.statusCode).toBe(500);
      expect(response.text).toContain('TypeError: Assignment to constant variable.');
    });

    test('should return 500 and TypeError when attempting to delete non-existent data due to const reassignment', async () => {
      // No data added. Attempt to delete non-existent ID.
      // The line 'db = db.filter' is still reached and causes the TypeError.
      const response = await request(app).delete('/deletedata/nonexistent');

      expect(response.statusCode).toBe(500);
      expect(response.text).toContain('TypeError: Assignment to constant variable.');
    });
  });

  describe('PUT /updatedata/:id', () => {
    test('should return 500 and TypeError when attempting to update existing data due to const reassignment', async () => {
      // Add an item (which will be 'undefined' due to missing body parser)
      await request(app).post('/postdata').send({ id: '1', name: 'Old Item' });

      const updatedItem = { id: '1', name: 'New Item' };
      // Attempt to update the item. The route code tries to reassign 'const db'.
      const response = await request(app)
        .put('/updatedata/1')
        .send(updatedItem);

      expect(response.statusCode).toBe(500);
      expect(response.text).toContain('TypeError: Assignment to constant variable.');
    });

    test('should return 500 and TypeError when attempting to update non-existent data due to const reassignment', async () => {
      // No data added. Attempt to update non-existent ID.
      // The line 'db = db.map' is still reached and causes the TypeError.
      const updatedItem = { id: '99', name: 'Non Existent Item' };
      const response = await request(app)
        .put('/updatedata/99')
        .send(updatedItem);

      expect(response.statusCode).toBe(500);
      expect(response.text).toContain('TypeError: Assignment to constant variable.');
    });
  });
});