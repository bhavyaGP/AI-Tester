const mongoose = require('mongoose');
const Student = require('../../server/models/students.js');

beforeAll(async () => {
    await mongoose.connect('mongodb://localhost:27017/testdb', {
        useNewUrlParser: true,
        useUnifiedTopology: true
    });
});

afterAll(async () => {
    await mongoose.disconnect();
});

describe('Student Model', () => {
    it('should create a new student', async () => {
        const student = new Student({ name: 'John', surname: 'Doe' });
        await student.save();
        expect(student._id).toBeDefined();
        expect(student.name).toBe('John');
        expect(student.surname).toBe('Doe');
    });

    it('should not create a student without name', async () => {
        await expect(Student.create({ surname: 'Doe' })).rejects.toThrow();
    });

    it('should not create a student without surname', async () => {
        await expect(Student.create({ name: 'John' })).rejects.toThrow();
    });


    it('should find a student by ID', async () => {
        const student = new Student({ name: 'Jane', surname: 'Doe' });
        await student.save();
        const foundStudent = await Student.findById(student._id);
        expect(foundStudent._id.toString()).toBe(student._id.toString());
        expect(foundStudent.name).toBe('Jane');
        expect(foundStudent.surname).toBe('Doe');
    });

    it('should return null if student not found', async () => {
        const student = await Student.findById('654654654654654');
        expect(student).toBeNull();
    });

    it('should update a student', async () => {
        const student = new Student({ name: 'Peter', surname: 'Jones' });
        await student.save();
        student.name = 'UpdatedName';
        await student.save();
        const updatedStudent = await Student.findById(student._id);
        expect(updatedStudent.name).toBe('UpdatedName');
    });

    it('should delete a student', async () => {
        const student = new Student({ name: 'Test', surname: 'Delete' });
        await student.save();
        await Student.findByIdAndDelete(student._id);
        const deletedStudent = await Student.findById(student._id);
        expect(deletedStudent).toBeNull();
    });

    it('should handle invalid input gracefully', async () => {
        await expect(Student.create({ name: 123, surname: 456 })).rejects.toThrow();
        await expect(Student.create({ name: null, surname: null })).rejects.toThrow();
        await expect(Student.create({ name: undefined, surname: undefined })).rejects.toThrow();
    });

});

