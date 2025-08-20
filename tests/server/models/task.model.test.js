const mongoose = require('mongoose');
const Task = require('./path/to/your/task-model'); // Replace with the actual path

describe('Task Model', () => {
  beforeAll(() => {
    return mongoose.connect('mongodb://localhost:27017/test-database', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
  });

  afterAll(() => {
    return mongoose.disconnect();
  });

  afterEach(async () => {
    await Task.deleteMany({});
  });


  it('should create a new task', async () => {
    const task = new Task({
      taskId: 'TASK123',
      level: 1,
      problem: 'Problem statement',
      correctAnswer: 'Correct answer',
      hint: 'Hint',
      toolsRequired: ['tool1', 'tool2'],
      reward: 10,
      solution: 'Solution'
    });
    await task.save();
    expect(task._id).toBeDefined();
  });

  it('should fail to create a task without taskId', async () => {
    const task = new Task({
      level: 1,
      problem: 'Problem statement',
      correctAnswer: 'Correct answer'
    });
    await expect(task.save()).rejects.toThrow();
  });

  it('should fail to create a task with duplicate taskId', async () => {
    const task1 = new Task({
      taskId: 'TASK123',
      level: 1,
      problem: 'Problem statement',
      correctAnswer: 'Correct answer'
    });
    await task1.save();
    const task2 = new Task({
      taskId: 'TASK123',
      level: 2,
      problem: 'Another problem',
      correctAnswer: 'Another answer'
    });
    await expect(task2.save()).rejects.toThrow();
  });

  it('should find a task by taskId', async () => {
    const task = await new Task({
      taskId: 'TASK456',
      level: 1,
      problem: 'Problem statement',
      correctAnswer: 'Correct answer'
    }).save()
    const foundTask = await Task.findOne({ taskId: 'TASK456' });
    expect(foundTask.taskId).toBe('TASK456');
  });

  it('should find a task by level', async () => {
    const task = await new Task({
      taskId: 'TASK789',
      level: 5,
      problem: 'Problem statement',
      correctAnswer: 'Correct answer'
    }).save()
    const foundTask = await Task.findOne({ level: 5 });
    expect(foundTask.level).toBe(5);
  });


  it('should handle null or undefined values gracefully', async () => {
    const task = new Task({
      taskId: 'TASK000',
      level: 1,
      problem: 'Problem statement',
      correctAnswer: 'Correct answer',
      hint: null,
      toolsRequired: [],
      reward: undefined,
      solution: null
    });
    await task.save();
    expect(task.hint).toBeNull();
    expect(task.reward).toBeUndefined();
    expect(task.solution).toBeNull();
  });

  it('should update a task', async () => {
    const task = await new Task({
      taskId: 'TASKXYZ',
      level: 1,
      problem: 'Original problem',
      correctAnswer: 'Original answer'
    }).save();
    task.problem = 'Updated problem';
    await task.save();
    const updatedTask = await Task.findById(task._id);
    expect(updatedTask.problem).toBe('Updated problem');
  });


  it('should delete a task', async () => {
    const task = await new Task({
      taskId: 'TASKDEL',
      level: 1,
      problem: 'Problem statement',
      correctAnswer: 'Correct answer'
    }).save();
    await Task.findByIdAndDelete(task._id);
    const deletedTask = await Task.findById(task._id);
    expect(deletedTask).toBeNull();
  });
});
