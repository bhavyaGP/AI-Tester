const request = require('supertest');
const express = require('express');
const app = express();
const advancedRoutes = require('../../server/routes/advanced.routes.js');
app.use('/api/students', advancedRoutes);

const mockAdv = {
  search: jest.fn(),
  count: jest.fn(),
  recent: jest.fn(),
  bulk: jest.fn(),
  bySurname: jest.fn()
};

const mockValidate = {
  validateBulk: jest.fn((req, res, next) => next())
};

jest.mock('../controller/student.advanced.controller', () => mockAdv);
jest.mock('../middleware/validate.student', () => mockValidate);


describe('Advanced Student Routes', () => {
  afterEach(() => {
    mockAdv.search.mockClear();
    mockAdv.count.mockClear();
    mockAdv.recent.mockClear();
    mockAdv.bulk.mockClear();
    mockAdv.bySurname.mockClear();
    mockValidate.validateBulk.mockClear();
  });

  it('GET /api/students/search should call adv.search', async () => {
    await request(app).get('/api/students/search');
    expect(mockAdv.search).toHaveBeenCalled();
  });

  it('GET /api/students/count should call adv.count', async () => {
    await request(app).get('/api/students/count');
    expect(mockAdv.count).toHaveBeenCalled();
  });

  it('GET /api/students/recent should call adv.recent', async () => {
    await request(app).get('/api/students/recent');
    expect(mockAdv.recent).toHaveBeenCalled();
  });

  it('POST /api/students/bulk should call validate.validateBulk and adv.bulk', async () => {
    await request(app).post('/api/students/bulk').send({});
    expect(mockValidate.validateBulk).toHaveBeenCalled();
    expect(mockAdv.bulk).toHaveBeenCalled();
  });

  it('GET /api/students/surname/:surname should call adv.bySurname', async () => {
    await request(app).get('/api/students/surname/testSurname');
    expect(mockAdv.bySurname).toHaveBeenCalled();
  });

  it('GET /api/students/surname/:surname handles invalid surname', async () => {
    const res = await request(app).get('/api/students/surname/');
    expect(res.status).toBeGreaterThanOrEqual(400);
  });


  it('POST /api/students/bulk handles errors', async () => {
    mockValidate.validateBulk.mockImplementation((req, res, next) => next(new Error('Validation failed')));
    const res = await request(app).post('/api/students/bulk').send({});
    expect(res.status).toBeGreaterThanOrEqual(500);
  });

});
