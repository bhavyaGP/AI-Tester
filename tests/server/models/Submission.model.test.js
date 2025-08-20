const mongoose = require('mongoose');
const Submission = require('./submissionModel');

describe('Submission Model', () => {
  beforeAll(async () => {
    await mongoose.connect('mongodb://localhost:27017/testDatabase', { useNewUrlParser: true, useUnifiedTopology: true });
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it('should create a new submission', async () => {
    const submission = new Submission({
      userId: new mongoose.Types.ObjectId(),
      levelId: 1,
      submittedAnswer: 'test',
      isCorrect: true,
    });
    await submission.save();
    expect(submission._id).toBeDefined();
  });

  it('should require userId', async () => {
    expect(() => new Submission({ levelId: 1, submittedAnswer: 'test', isCorrect: true })).toThrow();
  });

  it('should require levelId', async () => {
    expect(() => new Submission({ userId: new mongoose.Types.ObjectId(), submittedAnswer: 'test', isCorrect: true })).toThrow();
  });

  it('should require submittedAnswer', async () => {
    expect(() => new Submission({ userId: new mongoose.Types.ObjectId(), levelId: 1, isCorrect: true })).toThrow();
  });

  it('should require isCorrect', async () => {
    expect(() => new Submission({ userId: new mongoose.Types.ObjectId(), levelId: 1, submittedAnswer: 'test' })).toThrow();
  });

  it('should set default time', async () => {
    const submission = new Submission({
      userId: new mongoose.Types.ObjectId(),
      levelId: 1,
      submittedAnswer: 'test',
      isCorrect: true,
    });
    expect(submission.time).toBeDefined();
  });


  it('should find a submission by ID', async () => {
    const submission = new Submission({
      userId: new mongoose.Types.ObjectId(),
      levelId: 1,
      submittedAnswer: 'test',
      isCorrect: true,
    });
    await submission.save();
    const foundSubmission = await Submission.findById(submission._id);
    expect(foundSubmission._id.toString()).toBe(submission._id.toString());
  });

  it('should handle incorrect ObjectId', async () => {
    const invalidId = 'invalidObjectId';
    const submission = await Submission.findById(invalidId);
    expect(submission).toBeNull();
  });

  it('should handle finding a non-existent submission', async () => {
    const submission = await Submission.findById(new mongoose.Types.ObjectId());
    expect(submission).toBeNull();
  });

});
