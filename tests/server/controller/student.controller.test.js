const studentController = require('../../server/controller/student.controller.js');
const Student = require('../../models/students');
const { response } = require('express');

jest.mock('../../models/students');


describe('studentController', () => {

    let req, res, next;

    beforeEach(() => {
        req = {};
        res = {
            json: jest.fn()
        };
        next = jest.fn();
    });

    describe('getStudents', () => {
        it('should return a list of students', async () => {
            Student.find.mockResolvedValue([{ name: 'test', surname: 'test' }]);
            await studentController.getStudents(req, res);
            expect(res.json).toHaveBeenCalledWith([{ name: 'test', surname: 'test' }]);
        });
        it('should handle errors', async () => {
            Student.find.mockRejectedValue(new Error('failed'));
            await studentController.getStudents(req, res, next);
            expect(next).toHaveBeenCalledWith(new Error('failed'));
        });

    });


    describe('createStudent', () => {
        it('should create a new student', async () => {
            req.body = { name: 'test', surname: 'test' };
            await studentController.createStudent(req, res);
            expect(res.json).toHaveBeenCalledWith({ status: 'Student created' });
        });
        it('should handle errors', async () => {
            req.body = { name: 'test', surname: 'test' };
            Student.mockImplementation(() => ({ save: () => { throw new Error('failed') } }));
            await studentController.createStudent(req, res, next);
            expect(next).toHaveBeenCalledWith(new Error('failed'));

        });
    });

    describe('getStudent', () => {
        it('should return a single student', async () => {
            req.params = { id: '1' };
            Student.findById.mockResolvedValue({ name: 'test', surname: 'test' });
            await studentController.getStudent(req, res);
            expect(res.json).toHaveBeenCalledWith({ name: 'test', surname: 'test' });
        });
        it('should handle errors', async () => {
            req.params = { id: '1' };
            Student.findById.mockRejectedValue(new Error('failed'));
            await studentController.getStudent(req, res, next);
            expect(next).toHaveBeenCalledWith(new Error('failed'));
        });
    });

    describe('editStudent', () => {
        it('should update a student', async () => {
            req.params = { id: '1' };
            req.body = { name: 'test2', surname: 'test2' };
            Student.findByIdAndUpdate.mockResolvedValue({ name: 'test2', surname: 'test2' });
            await studentController.editStudent(req, res);
            expect(res.json).toHaveBeenCalledWith({ status: 'Student updated' });
        });
        it('should handle errors', async () => {
            req.params = { id: '1' };
            req.body = { name: 'test2', surname: 'test2' };
            Student.findByIdAndUpdate.mockRejectedValue(new Error('failed'));
            await studentController.editStudent(req, res, next);
            expect(next).toHaveBeenCalledWith(new Error('failed'));
        });
    });

    describe('deleteStudent', () => {
        it('should delete a student', async () => {
            req.params = { id: '1' };
            await studentController.deleteStudent(req, res);
            expect(res.json).toHaveBeenCalledWith({ status: 'Student removed' });
        });
        it('should handle errors', async () => {
            req.params = { id: '1' };
            Student.findByIdAndRemove.mockRejectedValue(new Error('failed'));
            await studentController.deleteStudent(req, res, next);
            expect(next).toHaveBeenCalledWith(new Error('failed'));
        });
    });
});
