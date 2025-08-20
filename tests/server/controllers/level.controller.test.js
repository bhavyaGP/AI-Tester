const Level = require("../models/Level.model");
const Submission = require("../models/Submission.model");
const User = require("../models/user.model");
const controllers = require("../controllers/level.controller");

jest.mock("../models/Level.model");
jest.mock("../models/Submission.model");
jest.mock("../models/user.model");

describe("getAvailableLevels", () => {
  it("should return levels less than or equal to user.currentLevel", async () => {
    const req = { user: { currentLevel: 3 } };
    const res = { json: jest.fn() };
    Level.find.mockResolvedValue([{ number: 1 }, { number: 2 }, { number: 3 }]);
    await controllers.getAvailableLevels(req, res);
    expect(Level.find).toHaveBeenCalledWith({ number: { $lte: 3 } });
    expect(res.json).toHaveBeenCalledWith([{ number: 1 }, { number: 2 }, { number: 3 }]);
  });
});

describe("getLevelDetails", () => {
  it("should return level details for given levelNumber", async () => {
    const req = { params: { levelNumber: 1 } };
    const res = { json: jest.fn() };
    Level.findOne.mockResolvedValue({ number: 1, name: "Level 1" });
    await controllers.getLevelDetails(req, res);
    expect(Level.findOne).toHaveBeenCalledWith({ number: 1 });
    expect(res.json).toHaveBeenCalledWith({ number: 1, name: "Level 1" });
  });
  it("should handle level not found", async () => {
    const req = { params: { levelNumber: 1 } };
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    Level.findOne.mockResolvedValue(null);
    await controllers.getLevelDetails(req, res);
    expect(Level.findOne).toHaveBeenCalledWith({ number: 1 });
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({error: "Level not found"});
  });
});

describe("getUnlockedLevels", () => {
  it("should return unlocked levels", async () => {
    const req = { user: { level: 3 } };
    const res = { json: jest.fn() };
    Level.find.mockResolvedValue([{ levelId: 1 }, { levelId: 2 }, { levelId: 3 }]);
    await controllers.getUnlockedLevels(req, res);
    expect(Level.find).toHaveBeenCalledWith({ levelId: { $lte: 3 } });
    expect(res.json).toHaveBeenCalledWith([{ levelId: 1 }, { levelId: 2 }, { levelId: 3 }]);
  });
  it("should handle error", async () => {
    const req = { user: { level: 3 } };
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    Level.find.mockRejectedValue(new Error("Failed to fetch unlocked levels"));
    await controllers.getUnlockedLevels(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch unlocked levels' });
  });
});

describe("getLevelById", () => {
  it("should return level by Id", async () => {
    const req = { params: { levelId: 1 } };
    const res = { json: jest.fn() };
    Level.findOne.mockResolvedValue({ levelId: 1, name: "Level 1" });
    await controllers.getLevelById(req, res);
    expect(Level.findOne).toHaveBeenCalledWith({ levelId: 1 });
    expect(res.json).toHaveBeenCalledWith({ levelId: 1, name: "Level 1" });
  });
  it("should handle level not found", async () => {
    const req = { params: { levelId: 1 } };
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    Level.findOne.mockResolvedValue(null);
    await controllers.getLevelById(req, res);
    expect(Level.findOne).toHaveBeenCalledWith({ levelId: 1 });
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Level not found' });
  });
  it("should handle error", async () => {
    const req = { params: { levelId: 1 } };
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    Level.findOne.mockRejectedValue(new Error("Failed to fetch level"));
    await controllers.getLevelById(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch level' });
  });
});

describe("submitLevelAnswer", () => {
  it("should submit correct answer and update user level", async () => {
    const req = { params: { levelId: 1 }, body: { answer: "correct" }, user: { _id: 1, level: 1, coins: 0 } };
    const res = { json: jest.fn() };
    Level.findOne.mockResolvedValue({ levelId: 1, correctAnswer: "correct", coinsRewarded: 10 });
    User.save.mockResolvedValue({});
    Submission.create.mockResolvedValue({});
    await controllers.submitLevelAnswer(req, res);
    expect(res.json).toHaveBeenCalledWith({ correct: true, message: 'Correct! Next level unlocked.' });
    expect(req.user.level).toBe(2);
    expect(req.user.coins).toBe(10);

  });
  it("should submit incorrect answer", async () => {
    const req = { params: { levelId: 1 }, body: { answer: "wrong" }, user: { _id: 1, level: 1, coins: 0 } };
    const res = { json: jest.fn() };
    Level.findOne.mockResolvedValue({ levelId: 1, correctAnswer: "correct", coinsRewarded: 10 });
    Submission.create.mockResolvedValue({});
    await controllers.submitLevelAnswer(req, res);
    expect(res.json).toHaveBeenCalledWith({ correct: false, message: 'Incorrect. Try again or ask Raju for help.' });
    expect(req.user.level).toBe(1);
    expect(req.user.coins).toBe(0);
  });
  it("should handle level not found", async () => {
    const req = { params: { levelId: 1 }, body: { answer: "correct" }, user: { _id: 1, level: 1, coins: 0 } };
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    Level.findOne.mockResolvedValue(null);
    await controllers.submitLevelAnswer(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
  it("should handle error", async () => {
    const req = { params: { levelId: 1 }, body: { answer: "correct" }, user: { _id: 1, level: 1, coins: 0 } };
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    Level.findOne.mockRejectedValue(new Error("Failed to submit answer"));
    await controllers.submitLevelAnswer(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to submit answer' });
  });
});

describe("unlockNextLevel", () => {
  it("should unlock next level", async () => {
    const req = { params: { levelId: 1 }, user: { level: 1, save: jest.fn() } };
    const res = { json: jest.fn() };
    await controllers.unlockNextLevel(req, res);
    expect(req.user.save).toHaveBeenCalled();
    expect(req.user.level).toBe(2);
    expect(res.json).toHaveBeenCalledWith({ message: 'Next level unlocked', newLevel: 2 });
  });
  it("should handle cannot unlock level", async () => {
    const req = { params: { levelId: 2 }, user: { level: 1, save: jest.fn() } };
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    await controllers.unlockNextLevel(req, res);
    expect(req.user.save).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Cannot unlock this level yet.' });
  });
  it("should handle error", async () => {
    const req = { params: { levelId: 1 }, user: { level: 1, save: jest.fn().mockRejectedValue(new Error("Failed to unlock next level")) } };
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    await controllers.unlockNextLevel(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to unlock next level' });
  });
});
