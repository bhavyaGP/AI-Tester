const Task = require("../models/task.model");
const { getLevelTasks, submitAnswer } = require("../controllers/task.controller");

jest.mock("../models/task.model");

describe("getLevelTasks", () => {
  it("should return tasks for a given level", async () => {
    const mockTasks = [{ level: "easy", question: "q1", correctAnswer: "a1" }];
    Task.find.mockResolvedValue(mockTasks);
    const req = { params: { level: "easy" } };
    const res = { json: jest.fn() };
    await getLevelTasks(req, res);
    expect(Task.find).toHaveBeenCalledWith({ level: "easy" });
    expect(res.json).toHaveBeenCalledWith(mockTasks);
  });

  it("should handle errors", async () => {
    Task.find.mockRejectedValue(new Error("Failed to fetch tasks"));
    const req = { params: { level: "easy" } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await getLevelTasks(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Failed to fetch tasks" });
  });

  it("should handle empty results", async () => {
    Task.find.mockResolvedValue([]);
    const req = { params: { level: "easy" } };
    const res = { json: jest.fn() };
    await getLevelTasks(req, res);
    expect(Task.find).toHaveBeenCalledWith({ level: "easy" });
    expect(res.json).toHaveBeenCalledWith([]);
  });
});


describe("submitAnswer", () => {
  it("should return correct response for correct answer", async () => {
    const mockTask = { _id: "1", level: "easy", correctAnswer: "a1" };
    Task.findById.mockResolvedValue(mockTask);
    const req = { body: { level: "easy", taskId: "1", userAnswer: "a1" } };
    const res = { json: jest.fn() };
    await submitAnswer(req, res);
    expect(Task.findById).toHaveBeenCalledWith("1");
    expect(res.json).toHaveBeenCalledWith({ correct: true, message: "Sahi jawab bhai!" });
  });

  it("should return correct response for incorrect answer", async () => {
    const mockTask = { _id: "1", level: "easy", correctAnswer: "a1" };
    Task.findById.mockResolvedValue(mockTask);
    const req = { body: { level: "easy", taskId: "1", userAnswer: "a2" } };
    const res = { json: jest.fn() };
    await submitAnswer(req, res);
    expect(Task.findById).toHaveBeenCalledWith("1");
    expect(res.json).toHaveBeenCalledWith({ correct: false, message: "Galat hai! Raju se puchh lo?" });
  });


  it("should handle task not found", async () => {
    Task.findById.mockResolvedValue(null);
    const req = { body: { level: "easy", taskId: "1", userAnswer: "a1" } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await submitAnswer(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Task not found" });
  });

  it("should handle errors", async () => {
    Task.findById.mockRejectedValue(new Error("Failed to submit answer"));
    const req = { body: { level: "easy", taskId: "1", userAnswer: "a1" } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await submitAnswer(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Failed to submit answer" });
  });
});
