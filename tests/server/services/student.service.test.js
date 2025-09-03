const studentService = require('../../server/services/student.service.js');
const Student = require('../../models/students'); // Assuming this is a mock

jest.mock('../../models/students');

describe('studentService', () => {
    beforeEach(() => {
        Student.find.mockReset();
        Student.countDocuments.mockReset();
        Student.find.mockResolvedValue([]);
        Student.countDocuments.mockResolvedValue(0);
        Student.insertMany.mockResolvedValue([]);
    });

    describe('search', () => {
        it('should search by name and surname with query', async () => {
            Student.find.mockResolvedValue([{ name: 'John', surname: 'Doe' }]);
            const result = await studentService.search('john');
            expect(result).toEqual([{ name: 'John', surname: 'Doe' }]);
            expect(Student.find).toHaveBeenCalledWith({ $or: [{ name: expect.any(RegExp) }, { surname: expect.any(RegExp) }] });
        });
        it('should return empty array if no query and no results', async () => {
            const result = await studentService.search();
            expect(result).toEqual([]);
        });
    });

    describe('count', () => {
        it('should count documents', async () => {
            Student.countDocuments.mockResolvedValue(10);
            const result = await studentService.count();
            expect(result).toBe(10);
        });
        it('should handle errors', async () => {
            Student.countDocuments.mockRejectedValue(new Error('Count failed'));
            await expect(studentService.count()).rejects.toThrow('Count failed');
        });
    });

    describe('recent', () => {
        it('should return recent students with default limit', async () => {
            Student.find.mockResolvedValue([{ name: 'John', surname: 'Doe' }]);
            const result = await studentService.recent();
            expect(result).toEqual([{ name: 'John', surname: 'Doe' }]);
            expect(Student.find).toHaveBeenCalledWith().sort({ _id: -1 }).limit(5);
        });
        it('should return recent students with specified limit', async () => {
            Student.find.mockResolvedValue([{ name: 'John', surname: 'Doe' }]);
            const result = await studentService.recent(10);
            expect(result).toEqual([{ name: 'John', surname: 'Doe' }]);
            expect(Student.find).toHaveBeenCalledWith().sort({ _id: -1 }).limit(10);
        });
    });


    describe('bulkCreate', () => {
        it('should create multiple students', async () => {
            const list = [{ name: 'John', surname: 'Doe' }, { name: 'Jane', surname: 'Doe' }];
            await studentService.bulkCreate(list);
            expect(Student.insertMany).toHaveBeenCalledWith([{ name: 'John', surname: 'Doe' }, { name: 'Jane', surname: 'Doe' }]);
        });
        it('should handle empty list', async () => {
            await studentService.bulkCreate([]);
            expect(Student.insertMany).toHaveBeenCalledWith([]);
        });
    });

    describe('findBySurname', () => {
        it('should find students by surname', async () => {
            Student.find.mockResolvedValue([{ name: 'John', surname: 'Doe' }]);
            const result = await studentService.findBySurname('Doe');
            expect(result).toEqual([{ name: 'John', surname: 'Doe' }]);
            expect(Student.find).toHaveBeenCalledWith({ surname: expect.any(RegExp) });
        });
        it('should return empty array if no surname provided', async () => {
            const result = await studentService.findBySurname();
            expect(result).toEqual([]);
        });
        it('should handle empty result', async () => {
            const result = await studentService.findBySurname('NonExistentSurname');
            expect(result).toEqual([]);
        });
    });
});
