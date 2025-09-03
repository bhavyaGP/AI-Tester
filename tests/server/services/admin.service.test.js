const adminService = require('../../server/services/admin.service.js');
const Student = require('../../server/models/students'); // Assuming this is the correct path
const csvUtil = require('../../server/utils/csvExporter'); // Assuming this is the correct path

jest.mock('../../server/models/students');
jest.mock('../../server/utils/csvExporter');

describe('Admin Service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('stats', () => {
    it('should return stats correctly', async () => {
      Student.countDocuments.mockResolvedValue(100);
      Student.aggregate.mockResolvedValueOnce([{ _id: 'Smith', count: 50 }]);
      Student.aggregate.mockResolvedValueOnce([{ _id: 'A', count: 20 }]);
      const stats = await adminService.stats();
      expect(stats.total).toBe(100);
      expect(stats.topSurnames).toEqual([{ _id: 'Smith', count: 50 }]);
      expect(stats.distribution).toEqual([{ _id: 'A', count: 20 }]);
    });
    it('should handle errors gracefully', async () => {
      Student.countDocuments.mockRejectedValue(new Error('Count failed'));
      await expect(adminService.stats()).rejects.toThrow('Count failed');
    });

  });

  describe('exportCsv', () => {
    it('should export csv correctly', async () => {
      Student.find.mockResolvedValue([{ _id: 1, name: 'test', surname: 'user' }]);
      csvUtil.objectsToCsv.mockReturnValue('csv data');
      const csv = await adminService.exportCsv();
      expect(csv).toBe('csv data');
    });
    it('should handle errors gracefully', async () => {
      Student.find.mockRejectedValue(new Error('Find failed'));
      await expect(adminService.exportCsv()).rejects.toThrow('Find failed');
    });
  });


  describe('importCsv', () => {
    it('should import csv correctly', async () => {
      csvUtil.csvToObjects.mockReturnValue([{ name: 'test', surname: 'user' }]);
      Student.insertMany.mockResolvedValue([{ _id: 1, name: 'test', surname: 'user' }]);
      const result = await adminService.importCsv('csv data');
      expect(result.inserted).toBe(1);
    });
    it('should handle empty csv', async () => {
      csvUtil.csvToObjects.mockReturnValue([]);
      const result = await adminService.importCsv('');
      expect(result.inserted).toBe(0);
    });
    it('should handle errors gracefully', async () => {
      csvUtil.csvToObjects.mockReturnValue([{ name: 'test', surname: 'user' }]);
      Student.insertMany.mockRejectedValue(new Error('Insert failed'));
      await expect(adminService.importCsv('csv data')).rejects.toThrow('Insert failed');
    });
  });

  describe('seed', () => {
    it('should seed correctly', async () => {
      Student.insertMany.mockResolvedValue([{insertedCount:20}]);
      const result = await adminService.seed();
      expect(result.inserted).toBe(20);
    });
    it('should handle errors gracefully', async () => {
      Student.insertMany.mockRejectedValue(new Error('Seed failed'));
      await expect(adminService.seed()).rejects.toThrow('Seed failed');
    });

  });

  describe('clearAll', () => {
    it('should clear all documents', async () => {
      Student.deleteMany.mockResolvedValue({ deletedCount: 100 });
      const result = await adminService.clearAll();
      expect(result.deletedCount).toBe(100);
    });
    it('should handle errors gracefully', async () => {
      Student.deleteMany.mockRejectedValue(new Error('Clear failed'));
      await expect(adminService.clearAll()).rejects.toThrow('Clear failed');
    });
  });
});
