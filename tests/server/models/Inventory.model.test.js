const mongoose = require('mongoose');
const Inventory = require('./inventoryModel'); 

describe('Inventory Model', () => {
  beforeAll(async () => {
    await mongoose.connect('mongodb://localhost:27017/testDatabase', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  afterEach(async () => {
    await Inventory.deleteMany({});
  });


  it('should create a new inventory document', async () => {
    const inventory = new Inventory({ user: new mongoose.Types.ObjectId(), tools: ['hammer', 'saw'] });
    await inventory.save();
    expect(inventory._id).toBeDefined();
    expect(inventory.user).toBeDefined();
    expect(inventory.tools).toEqual(['hammer', 'saw']);
  });

  it('should throw an error if user is not provided', async () => {
    const inventory = new Inventory({ tools: ['hammer', 'saw'] });
    await expect(inventory.save()).rejects.toThrow();
  });

  it('should throw an error if user is not a valid ObjectId', async () => {
    const inventory = new Inventory({ user: 'invalidObjectId', tools: ['hammer', 'saw'] });
    await expect(inventory.save()).rejects.toThrow();
  });

  it('should add tools to the inventory', async () => {
    const inventory = new Inventory({ user: new mongoose.Types.ObjectId() });
    await inventory.save();
    inventory.tools.push('screwdriver');
    await inventory.save();
    expect(inventory.tools).toContain('screwdriver');
  });

  it('should find an inventory document by user id', async () => {
    const userId = new mongoose.Types.ObjectId();
    const inventory = new Inventory({ user: userId, tools: ['hammer'] });
    await inventory.save();
    const foundInventory = await Inventory.findOne({ user: userId });
    expect(foundInventory._id.toString()).toBe(inventory._id.toString());
  });

  it('should handle finding a non-existent inventory', async () => {
    const foundInventory = await Inventory.findOne({user: new mongoose.Types.ObjectId()});
    expect(foundInventory).toBeNull();
  });

  it('should handle updating an existing inventory document', async () => {
    const userId = new mongoose.Types.ObjectId();
    const inventory = new Inventory({ user: userId, tools: ['hammer'] });
    await inventory.save();
    const updatedInventory = await Inventory.findByIdAndUpdate(inventory._id, {tools: ['hammer', 'screwdriver']}, {new: true});
    expect(updatedInventory.tools).toEqual(['hammer', 'screwdriver']);
  })

  it('should handle deleting an inventory document', async () => {
    const inventory = new Inventory({ user: new mongoose.Types.ObjectId(), tools: ['hammer'] });
    await inventory.save();
    await Inventory.findByIdAndDelete(inventory._id);
    const deletedInventory = await Inventory.findById(inventory._id);
    expect(deletedInventory).toBeNull();
  });

  it('should correctly handle empty tools array', async () => {
    const inventory = new Inventory({ user: new mongoose.Types.ObjectId(), tools: [] });
    await inventory.save();
    expect(inventory.tools).toEqual([]);
  });

});
