jest.mock('mongoose');

const {Schema, model, Types} = require('mongoose');
const llmQueryModel = require('./llmQueryModel'); // Assuming the code is in llmQueryModel.js

describe('LLMQuery Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should export a Mongoose model', () => {
    expect(typeof llmQueryModel).toBe('function');
    expect(llmQueryModel.prototype instanceof mongoose.Model).toBe(true);
  });

  describe('Schema definition', () => {
    const schema = llmQueryModel.schema;

    test('userId is a required ObjectId', () => {
      expect(schema.paths.userId.options.required).toBe(true);
      expect(schema.paths.userId.options.type).toBe(Types.ObjectId);
      expect(schema.paths.userId.options.ref).toBe('User');
    });

    test('levelId is a Number', () => {
      expect(schema.paths.levelId.options.type).toBe(Number);
    });

    test('type is a required String', () => {
      expect(schema.paths.type.options.required).toBe(true);
      expect(schema.paths.type.options.type).toBe(String);
    });

    test('query is a required String', () => {
      expect(schema.paths.query.options.required).toBe(true);
      expect(schema.paths.query.options.type).toBe(String);
    });

    test('response is a String', () => {
      expect(schema.paths.response.options.type).toBe(String);
    });

    test('createdAt is a Date and defaults to Date.now', () => {
      expect(schema.paths.createdAt.options.type).toBe(Date);
      expect(schema.paths.createdAt.options.default).toBe(Date.now);
    });
  });

  describe('Model creation', () => {
    test('creates a new LLMQuery document', async () => {
      const mockUser = new Types.ObjectId();
      const newQuery = new llmQueryModel({
        userId: mockUser,
        levelId: 1,
        type: 'hint',
        query: 'test query',
      });
      expect(newQuery.userId).toEqual(mockUser);
      expect(newQuery.levelId).toEqual(1);
      expect(newQuery.type).toEqual('hint');
      expect(newQuery.query).toEqual('test query');
      expect(newQuery.response).toBeUndefined();
      expect(newQuery.createdAt).toBeDefined();
    });

    test('throws error if userId is missing', async () => {
      await expect(async () => {
        await new llmQueryModel({type: 'hint', query: 'test query'}).save();
      }).rejects.toThrow(/userId/)
    });

    test('throws error if type is missing', async () => {
      await expect(async () => {
        await new llmQueryModel({userId: new Types.ObjectId(), query: 'test query'}).save();
      }).rejects.toThrow(/type/)
    });

    test('throws error if query is missing', async () => {
      await expect(async () => {
        await new llmQueryModel({userId: new Types.ObjectId(), type: 'hint'}).save();
      }).rejects.toThrow(/query/)
    });
  });
});
