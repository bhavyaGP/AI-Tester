jest.mock('mongoose');

const Tool = require('./your-file-name'); //replace your-file-name

describe('Tool Model', () => {
  let mockMongooseModel;

  beforeEach(() => {
    mockMongooseModel = {
      schema: {},
      path: jest.fn(),
      methods: {},
      statics: {},
      pre: jest.fn(),
      post: jest.fn(),
      index: jest.fn(),
    };
    mongoose.model.mockReturnValue(mockMongooseModel);
  });

  it('should create a Tool model with the correct schema', () => {
    expect(mongoose.Schema).toHaveBeenCalledWith({
      toolId: { type: String, required: true, unique: true },
      name: String,
      description: String,
      unlockLevel: Number,
    });
    expect(mongoose.model).toHaveBeenCalledWith('Tool', expect.any(mongoose.Schema));
  });


  it('should correctly define toolId as required', () => {
    expect(Tool.schema.paths.toolId.options.required).toBe(true);
  });

  it('should correctly define toolId as unique', () => {
    expect(Tool.schema.paths.toolId.options.unique).toBe(true);
  });

  it('should handle missing toolId', async () => {
    await expect(Tool.create({})).rejects.toThrow();
  });


  it('should handle invalid toolId type', async () => {
    await expect(Tool.create({toolId: 123, name: 'test'})).rejects.toThrow();
  });

  it('should create a new Tool document', async () => {
    const tool = await Tool.create({ toolId: 'abc', name: 'Test Tool', description: 'Test description', unlockLevel: 1 });
    expect(tool.toolId).toBe('abc');
    expect(tool.name).toBe('Test Tool');
    expect(tool.description).toBe('Test description');
    expect(tool.unlockLevel).toBe(1);
  });


  it('should handle null values for optional fields', async () => {
    const tool = await Tool.create({ toolId: 'abc' });
    expect(tool.name).toBeUndefined();
    expect(tool.description).toBeUndefined();
    expect(tool.unlockLevel).toBeUndefined();
  });

    it('should handle different data types for optional fields', async () => {
    const tool = await Tool.create({ toolId: 'abc', name: 123, description: {a:1}, unlockLevel: '1'});
    expect(tool.name).toBe(123);
    expect(tool.description).toEqual({a:1});
    expect(tool.unlockLevel).toBe('1');
  });

});
