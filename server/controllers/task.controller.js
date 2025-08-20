const Task = require("../models/task.model");

exports.getLevelTasks = async (req, res) => {
  try {
    const { level } = req.params;
    const tasks = await Task.find({ level });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
};

exports.submitAnswer = async (req, res) => {
  try {
    const { level, taskId, userAnswer } = req.body;
    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const isCorrect = task.correctAnswer === userAnswer;

    if (isCorrect) {
      res.json({ correct: true, message: "Sahi jawab bhai!" });
    } else {
      res.json({ correct: false, message: "Galat hai! Raju se puchh lo?" });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit answer' });
  }
};
