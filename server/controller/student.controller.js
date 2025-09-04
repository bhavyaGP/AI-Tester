const Student = require('../models/students');

const studentController = {};

studentController.getStudents = async (req,res) => {
    const students = await Student.find();
    res.json(students);
}

studentController.createStudent = async (req,res) => {
    const student = new Student({
        name: req.body.name,
        surname: req.body.surname
    });
    await student.save();
    res.json({'status' : 'Student created'});
}

studentController.getStudent = async (req,res) => {
    
    const student = await Student.findById(req.params.id);
    res.json(student);
}

studentController.editStudent = async (req,res) => {
    const {id} = req.params;
    const student = {
        name: req.body.name,
        surname: req.body.surname
    }
    await Student.findByIdAndUpdate(id, {$set: student}, {new: true});

    res.json({'status': 'Student updated'});
}

studentController.deleteStudent = async (req,res) => {
    await Student.findByIdAndRemove(req.params.id);
    res.json({'status': 'Student removed'});
}

module.exports = studentController;