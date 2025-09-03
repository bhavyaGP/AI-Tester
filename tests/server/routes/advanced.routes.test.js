const request = require('supertest');
const express = require('express');
const app = express();
const advancedRoutes = require('../../server/routes/advanced.routes.js');
app.use('/api/advanced', advancedRoutes);


describe('Advanced Routes', () => {
  let server;
  beforeEach(() => {
    server = app.listen(0);
  });
  afterEach(() => {
    server.close();
  });

  describe('GET /search', () => {
    it('should return a search result', async () => {
      const res = await request(server).get('/api/advanced/search');
      expect(res.status).toBe(200);
    });
    it('should handle errors gracefully', async () => {
      const adv = require('../controller/student.advanced.controller');
      const spy = jest.spyOn(adv, 'search').mockImplementation(() => {throw new Error('test error');});
      const res = await request(server).get('/api/advanced/search');
      expect(res.status).not.toBe(200);
      spy.mockRestore();
    });
  });

  describe('GET /count', () => {
    it('should return a count', async () => {
      const res = await request(server).get('/api/advanced/count');
      expect(res.status).toBe(200);
    });
      it('should handle errors gracefully', async () => {
      const adv = require('../controller/student.advanced.controller');
      const spy = jest.spyOn(adv, 'count').mockImplementation(() => {throw new Error('test error');});
      const res = await request(server).get('/api/advanced/count');
      expect(res.status).not.toBe(200);
      spy.mockRestore();
    });
  });

  describe('GET /recent', () => {
    it('should return recent items', async () => {
      const res = await request(server).get('/api/advanced/recent');
      expect(res.status).toBe(200);
    });
      it('should handle errors gracefully', async () => {
      const adv = require('../controller/student.advanced.controller');
      const spy = jest.spyOn(adv, 'recent').mockImplementation(() => {throw new Error('test error');});
      const res = await request(server).get('/api/advanced/recent');
      expect(res.status).not.toBe(200);
      spy.mockRestore();
    });
  });

  describe('POST /bulk', () => {
    it('should handle bulk operations', async () => {
      const res = await request(server).post('/api/advanced/bulk').send({});
      expect(res.status).toBe(200);
    });
      it('should handle errors gracefully', async () => {
      const adv = require('../controller/student.advanced.controller');
      const spy = jest.spyOn(adv, 'bulk').mockImplementation(() => {throw new Error('test error');});
      const res = await request(server).post('/api/advanced/bulk').send({});
      expect(res.status).not.toBe(200);
      spy.mockRestore();
    });
  });

  describe('GET /surname/:surname', () => {
    it('should return items by surname', async () => {
      const res = await request(server).get('/api/advanced/surname/testSurname');
      expect(res.status).toBe(200);
    });
    it('should handle errors gracefully', async () => {
      const adv = require('../controller/student.advanced.controller');
      const spy = jest.spyOn(adv, 'bySurname').mockImplementation(() => {throw new Error('test error');});
      const res = await request(server).get('/api/advanced/surname/testSurname');
      expect(res.status).not.toBe(200);
      spy.mockRestore();
    });
  });
});
