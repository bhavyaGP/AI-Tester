const mongoose = require('mongoose');
const Level = require('./levelModel');

beforeAll(async () => {
  await mongoose.connect('mongodb://localhost:27017/testDatabase', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('Level Schema', () => {
  it('should create a new level successfully', async () => {
    const level = new Level({
      levelId: 1,
      title: 'Level 1',
      question: 'What is 1 + 1?',
      correctAnswer: '2',
      hints: ['Try basic arithmetic'],
      explanation: '1 + 1 = 2',
    });
    await level.save();
    expect(level._id).toBeDefined();
  });

  it('should throw an error if levelId is missing', async () => {
    const level = new Level({
      title: 'Level 1',
      question: 'What is 1 + 1?',
      correctAnswer: '2',
    });
    await expect(level.save()).rejects.toThrow();
  });

  it('should throw an error if title is missing', async () => {
    const level = new Level({
      levelId: 1,
      question: 'What is 1 + 1?',
      correctAnswer: '2',
    });
    await expect(level.save()).rejects.toThrow();
  });

  it('should throw an error if question is missing', async () => {
    const level = new Level({
      levelId: 1,
      title: 'Level 1',
      correctAnswer: '2',
    });
    await expect(level.save()).rejects.toThrow();
  });

  it('should throw an error if correctAnswer is missing', async () => {
    const level = new Level({
      levelId: 1,
      title: 'Level 1',
      question: 'What is 1 + 1?',
    });
    await expect(level.save()).rejects.toThrow();
  });

  it('should throw an error if levelId is not unique', async () => {
    await new Level({
      levelId: 2,
      title: 'Level 2',
      question: 'What is 2 + 2?',
      correctAnswer: '4',
    }).save();
    const level2 = new Level({
      levelId: 2,
      title: 'Level 2 Duplicate',
      question: 'What is 2 + 2?',
      correctAnswer: '4',
    });
    await expect(level2.save()).rejects.toThrow();
  });


  it('should handle hints array correctly', async () => {
    const level = new Level({
      levelId: 3,
      title: 'Level 3',
      question: 'What is 3 + 3?',
      correctAnswer: '6',
      hints: ['Try adding'],
    });
    await level.save();
    expect(level.hints).toEqual(['Try adding']);
  });

  it('should handle empty hints array', async () => {
    const level = new Level({
      levelId: 4,
      title: 'Level 4',
      question: 'What is 4 + 4?',
      correctAnswer: '8',
      hints: [],
    });
    await level.save();
    expect(level.hints).toEqual([]);
  });

  it('should handle null explanation', async () => {
    const level = new Level({
      levelId: 5,
      title: 'Level 5',
      question: 'What is 5 + 5?',
      correctAnswer: '10',
      explanation: null,
    });
    await level.save();
    expect(level.explanation).toBeNull();
  });

});

describe('Level Model', () => {
  it('should export the Level model', () => {
    expect(Level).toBeDefined();
  });
});
