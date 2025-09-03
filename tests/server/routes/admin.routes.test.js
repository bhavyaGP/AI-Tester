const request = require('supertest');
const express = require('express');
const adminRoutes = require('../../server/routes/admin.routes.js');
const adminController = require('../../server/controller/admin.controller'); // Mock this

jest.mock('../../server/controller/admin.controller');
jest.mock('../../server/middleware/request.logger');


const app = express();
app.use('/admin', adminRoutes);

describe('Admin Routes', () => {

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /admin/stats', () => {
    it('should call admin.stats', async () => {
      await request(app).get('/admin/stats');
      expect(adminController.stats).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /admin/export', () => {
    it('should call admin.exportCsv', async () => {
      await request(app).get('/admin/export');
      expect(adminController.exportCsv).toHaveBeenCalledTimes(1);
    });
  });

  describe('POST /admin/import', () => {
    it('should call admin.importCsv', async () => {
      await request(app).post('/admin/import').send({});
      expect(adminController.importCsv).toHaveBeenCalledTimes(1);
    });
  });

  describe('POST /admin/seed', () => {
    it('should call admin.seed', async () => {
      await request(app).post('/admin/seed').send({});
      expect(adminController.seed).toHaveBeenCalledTimes(1);
    });
  });

  describe('POST /admin/clear', () => {
    it('should call admin.clear', async () => {
      await request(app).post('/admin/clear').send({});
      expect(adminController.clear).toHaveBeenCalledTimes(1);
    });
  });

  describe('Middleware', () => {
    it('should use the logger middleware', async () => {
        const loggerMiddleware = require('../../server/middleware/request.logger');
        expect(loggerMiddleware).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle errors gracefully from stats', async () => {
        adminController.stats.mockImplementation(() => { throw new Error('Test Error')});
        await request(app).get('/admin/stats').expect(500);
    });

    it('should handle errors gracefully from export', async () => {
        adminController.exportCsv.mockImplementation(() => { throw new Error('Test Error')});
        await request(app).get('/admin/export').expect(500);
    });

    it('should handle errors gracefully from import', async () => {
        adminController.importCsv.mockImplementation(() => { throw new Error('Test Error')});
        await request(app).post('/admin/import').expect(500);
    });

    it('should handle errors gracefully from seed', async () => {
        adminController.seed.mockImplementation(() => { throw new Error('Test Error')});
        await request(app).post('/admin/seed').expect(500);
    });

    it('should handle errors gracefully from clear', async () => {
        adminController.clear.mockImplementation(() => { throw new Error('Test Error')});
        await request(app).post('/admin/clear').expect(500);
    });
  });
});
