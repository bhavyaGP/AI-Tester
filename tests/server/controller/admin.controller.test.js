const adminController = require('../../server/controller/admin.controller.js');
const { mockAdminService } = require('./mocks/admin.service.mock');

jest.mock('../../server/services/admin.service', () => mockAdminService);


describe('Admin Controller', () => {
    let req, res;

    beforeEach(() => {
        req = {};
        res = {
            json: jest.fn(),
            status: jest.fn(() => ({ json: jest.fn() })),
            setHeader: jest.fn(),
            send: jest.fn(),
        };
    });

    describe('stats', () => {
        it('should return stats data', async () => {
            await adminController.stats(req, res);
            expect(res.json).toHaveBeenCalledWith(mockAdminService.stats());
        });
        it('should handle errors', async () => {
            mockAdminService.stats.mockRejectedValue(new Error('test error'));
            await adminController.stats(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.status().json).toHaveBeenCalledWith({ error: 'test error' });
        });
    });

    describe('exportCsv', () => {
        it('should return csv data', async () => {
            await adminController.exportCsv(req, res);
            expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
            expect(res.send).toHaveBeenCalledWith(mockAdminService.exportCsv());
        });
        it('should handle errors', async () => {
            mockAdminService.exportCsv.mockRejectedValue(new Error('test error'));
            await adminController.exportCsv(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.status().json).toHaveBeenCalledWith({ error: 'test error' });
        });
    });

    describe('importCsv', () => {
        it('should import csv data', async () => {
            req.body = { csv: 'test csv' };
            await adminController.importCsv(req, res);
            expect(res.json).toHaveBeenCalledWith(mockAdminService.importCsv('test csv'));
        });
        it('should handle missing csv data', async () => {
            await adminController.importCsv(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.status().json).toHaveBeenCalledWith({ error: 'Expected csv text in body.csv' });
        });
        it('should handle errors', async () => {
            req.body = { csv: 'test csv' };
            mockAdminService.importCsv.mockRejectedValue(new Error('test error'));
            await adminController.importCsv(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.status().json).toHaveBeenCalledWith({ error: 'test error' });
        });
    });

    describe('seed', () => {
        it('should seed with default count', async () => {
            await adminController.seed(req, res);
            expect(res.json).toHaveBeenCalledWith(mockAdminService.seed(20));
        });
        it('should seed with specified count', async () => {
            req.query = { count: 30 };
            await adminController.seed(req, res);
            expect(res.json).toHaveBeenCalledWith(mockAdminService.seed(30));
        });
        it('should handle errors', async () => {
            mockAdminService.seed.mockRejectedValue(new Error('test error'));
            await adminController.seed(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.status().json).toHaveBeenCalledWith({ error: 'test error' });
        });
    });

    describe('clear', () => {
        it('should clear all data', async () => {
            await adminController.clear(req, res);
            expect(res.json).toHaveBeenCalledWith(mockAdminService.clearAll());
        });
        it('should handle errors', async () => {
            mockAdminService.clearAll.mockRejectedValue(new Error('test error'));
            await adminController.clear(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.status().json).toHaveBeenCalledWith({ error: 'test error' });
        });
    });
});
