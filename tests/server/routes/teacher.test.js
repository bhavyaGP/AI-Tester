const express = require('express');
const request = require('supertest');
const multer = require('multer');
const { authenticateTeacher, authenticateTeacherOrAdmin } = require('../middleware/authteacher.js');
const teacherRouter = require('../../server/routes/teacher.js');
const app = express();
app.use(express.json());
app.use('/teacher', teacherRouter);
const upload = multer({ dest: 'uploads/' });

describe('Teacher Routes', () => {

  it('should return Welcome message for GET /', async () => {
    const res = await request(app).get('/teacher/');
    expect(res.statusCode).toBe(200);
    expect(res.text).toBe("Welcome to the teacher homepage");
  });

  it('should render homepage for GET /uploadfile', async () => {
    const req = {user:{id:1}};
    const res = {render: jest.fn()};
    await authenticateTeacher(req, res, jest.fn())
    expect(res.render).toHaveBeenCalledWith("homepage");
  });

  it('should render addmarks page for GET /marks', async () => {
    const req = {user:{id:1}};
    const res = {render: jest.fn()};
    await authenticateTeacher(req, res, jest.fn())
    expect(res.render).toHaveBeenCalledWith("addmarks");
  });

  it('should render addactivitymarks page for GET /activitymarks', async () => {
    const req = {user:{id:1}};
    const res = {render: jest.fn()};
    await authenticateTeacher(req, res, jest.fn())
    expect(res.render).toHaveBeenCalledWith("addactivitymarks");
  });

  it('should get report for GET /report', async () => {
    const req = {user:{id:1}};
    const res = {send: jest.fn()};
    const next = jest.fn();
    const getReportMock = jest.fn().mockResolvedValue({status:200, message:"Report fetched"});
    await getReportMock(req, res, next)
    expect(res.send).toHaveBeenCalledWith({status:200, message:"Report fetched"});
  });

  it('should add student for POST /addstudent', async () => {
    const req = {user:{id:1}, body: {name: 'test'}, file: {path: 'test'}};
    const res = {send: jest.fn()};
    const next = jest.fn();
    const addstudentMock = jest.fn().mockResolvedValue({status:200, message:"Student added"});
    await addstudentMock(req, res, next)
    expect(res.send).toHaveBeenCalledWith({status:200, message:"Student added"});
  });

  it('should add marks for POST /uploadmarks', async () => {
    const req = {user:{id:1}, body: {name: 'test'}, file: {path: 'test'}};
    const res = {send: jest.fn()};
    const next = jest.fn();
    const addmarksMock = jest.fn().mockResolvedValue({status:200, message:"Marks added"});
    await addmarksMock(req, res, next)
    expect(res.send).toHaveBeenCalledWith({status:200, message:"Marks added"});
  });

  it('should show all students for GET /allstudent', async () => {
    const req = {user:{id:1}};
    const res = {send: jest.fn()};
    const next = jest.fn();
    const showsAllStudentsMock = jest.fn().mockResolvedValue({status:200, message:"Students fetched"});
    await showsAllStudentsMock(req, res, next)
    expect(res.send).toHaveBeenCalledWith({status:200, message:"Students fetched"});
  });

  it('should add activity marks for POST /activitymarks', async () => {
    const req = {user:{id:1}, body: {name: 'test'}, file: {path: 'test'}};
    const res = {send: jest.fn()};
    const next = jest.fn();
    const addactivitymarksMock = jest.fn().mockResolvedValue({status:200, message:"Activity marks added"});
    await addactivitymarksMock(req, res, next)
    expect(res.send).toHaveBeenCalledWith({status:200, message:"Activity marks added"});
  });

  it('should get dashboard data for GET /dashboarddata', async () => {
    const req = {user:{id:1}};
    const res = {send: jest.fn()};
    const next = jest.fn();
    const teacherdashboarddataMock = jest.fn().mockResolvedValue({status:200, message:"Dashboard data fetched"});
    await teacherdashboarddataMock(req, res, next)
    expect(res.send).toHaveBeenCalledWith({status:200, message:"Dashboard data fetched"});
  });


  it('should get tabular data for GET /tabulardata', async () => {
    const req = {user:{id:1}};
    const res = {send: jest.fn()};
    const next = jest.fn();
    const teachertabulardataMock = jest.fn().mockResolvedValue({status:200, message:"Tabular data fetched"});
    await teachertabulardataMock(req, res, next)
    expect(res.send).toHaveBeenCalledWith({status:200, message:"Tabular data fetched"});
  });

  it('should add achievement for POST /addachivement', async () => {
    const req = {user:{id:1}, body: {name: 'test'}};
    const res = {send: jest.fn()};
    const next = jest.fn();
    const addachivementMock = jest.fn().mockResolvedValue({status:200, message:"Achievement added"});
    await addachivementMock(req, res, next)
    expect(res.send).toHaveBeenCalledWith({status:200, message:"Achievement added"});
  });

  it('should update marks for POST /updatemarks', async () => {
    const req = {user:{id:1}, body: {name: 'test'}};
    const res = {send: jest.fn()};
    const next = jest.fn();
    const updatemarksMock = jest.fn().mockResolvedValue({status:200, message:"Marks updated"});
    await updatemarksMock(req, res, next)
    expect(res.send).toHaveBeenCalledWith({status:200, message:"Marks updated"});
  });

  it('should get all achievements for GET /allachivement', async () => {
    const req = {user:{id:1}};
    const res = {send: jest.fn()};
    const next = jest.fn();
    const allachivementMock = jest.fn().mockResolvedValue({status:200, message:"Achievements fetched"});
    await allachivementMock(req, res, next)
    expect(res.send).toHaveBeenCalledWith({status:200, message:"Achievements fetched"});
  });

  it('should update student for POST /updatestudent', async () => {
    const req = {user:{id:1}, body: {name: 'test'}};
    const res = {send: jest.fn()};
    const next = jest.fn();
    const updatestudentMock = jest.fn().mockResolvedValue({status:200, message:"Student updated"});
    await updatestudentMock(req, res, next)
    expect(res.send).toHaveBeenCalledWith({status:200, message:"Student updated"});
  });

  it('should delete student for DELETE /deletestudent', async () => {
    const req = {user:{id:1}, body: {name: 'test'}};
    const res = {send: jest.fn()};
    const next = jest.fn();
    const deletestudentMock = jest.fn().mockResolvedValue({status:200, message:"Student deleted"});
    await deletestudentMock(req, res, next)
    expect(res.send).toHaveBeenCalledWith({status:200, message:"Student deleted"});
  });

  it('should get all marks for GET /getallmarks', async () => {
    const req = {user:{id:1}};
    const res = {send: jest.fn()};
    const next = jest.fn();
    const getallMarksMock = jest.fn().mockResolvedValue({status:200, message:"All marks fetched"});
    await getallMarksMock(req, res, next)
    expect(res.send).toHaveBeenCalledWith({status:200, message:"All marks fetched"});
  });

});
