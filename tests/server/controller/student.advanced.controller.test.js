const adv = require('../../server/controller/student.advanced.controller.js');
const { mockStudentService } = require('../mocks/student.service.mock');

jest.mock('../../server/services/student.service', () => mockStudentService);

const req = { query: {}, params: {}, body: {} };
const res = {
    json: jest.fn(),
    status: jest.fn(() => ({ json: jest.fn() })),
};

describe('adv.search', () => {
    it('should search students successfully', async () => {
        req.query.q = 'test';
        await adv.search(req, res);
        expect(res.json).toHaveBeenCalledWith(mockStudentService.search.mock.results[0].value);
    });
    it('should handle empty query', async () => {
        await adv.search(req, res);
        expect(res.json).toHaveBeenCalledWith(mockStudentService.search.mock.results[1].value);
    });
    it('should handle search error', async () => {
        mockStudentService.search.mockRejectedValue(new Error('Search failed'));
        await adv.search(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.status().json).toHaveBeenCalledWith({ error: 'Search failed' });
    });
});

describe('adv.count', () => {
    it('should count students successfully', async () => {
        await adv.count(req, res);
        expect(res.json).toHaveBeenCalledWith({ count: mockStudentService.count.mock.results[0].value });
    });
    it('should handle count error', async () => {
        mockStudentService.count.mockRejectedValue(new Error('Count failed'));
        await adv.count(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.status().json).toHaveBeenCalledWith({ error: 'Count failed' });
    });
});

describe('adv.recent', () => {
    it('should get recent students with default limit', async () => {
        await adv.recent(req, res);
        expect(res.json).toHaveBeenCalledWith(mockStudentService.recent.mock.results[0].value);
    });
    it('should get recent students with specified limit', async () => {
        req.query.limit = '10';
        await adv.recent(req, res);
        expect(res.json).toHaveBeenCalledWith(mockStudentService.recent.mock.results[1].value);
    });
    it('should handle recent error', async () => {
        mockStudentService.recent.mockRejectedValue(new Error('Recent failed'));
        await adv.recent(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.status().json).toHaveBeenCalledWith({ error: 'Recent failed' });
    });
});

describe('adv.bulk', () => {
    it('should create students successfully', async () => {
        req.body = [{ name: 'test1' }, { name: 'test2' }];
        await adv.bulk(req, res);
        expect(res.json).toHaveBeenCalledWith({ inserted: 2 });
    });
    it('should handle invalid input', async () => {
        req.body = { name: 'test' };
        await adv.bulk(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.status().json).toHaveBeenCalledWith({ error: 'Expected an array' });
    });
    it('should handle bulk error', async () => {
        req.body = [{ name: 'test1' }, { name: 'test2' }];
        mockStudentService.bulkCreate.mockRejectedValue(new Error('Bulk failed'));
        await adv.bulk(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.status().json).toHaveBeenCalledWith({ error: 'Bulk failed' });
    });
});

describe('adv.bySurname', () => {
    it('should find students by surname successfully', async () => {
        req.params.surname = 'test';
        await adv.bySurname(req, res);
        expect(res.json).toHaveBeenCalledWith(mockStudentService.findBySurname.mock.results[0].value);
    });
    it('should handle empty surname', async () => {
        await adv.bySurname(req, res);
        expect(res.json).toHaveBeenCalledWith(mockStudentService.findBySurname.mock.results[1].value);
    });
    it('should handle surname error', async () => {
        req.params.surname = 'test';
        mockStudentService.findBySurname.mockRejectedValue(new Error('Surname failed'));
        await adv.bySurname(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.status().json).toHaveBeenCalledWith({ error: 'Surname failed' });
    });
});
