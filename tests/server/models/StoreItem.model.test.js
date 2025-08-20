const mongoose = require('mongoose');
const StoreItem = require('./store-item-model');

describe('StoreItem Model', () => {
  beforeAll(async () => {
    await mongoose.connect('mongodb://localhost:27017/test-db', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  afterEach(async () => {
    await StoreItem.deleteMany({});
  });


  it('should create a new store item', async () => {
    const storeItem = new StoreItem({ itemId: '1', name: 'Item 1', cost: 10, type: 'A' });
    await storeItem.save();
    expect(storeItem._id).toBeDefined();
  });

  it('should fail to create a store item with missing itemId', async () => {
    await expect(StoreItem.create({})).rejects.toThrow();
  });

  it('should fail to create a store item with missing name', async () => {
    await expect(StoreItem.create({ itemId: '1', cost: 10, type: 'A' })).rejects.toThrow();
  });

  it('should fail to create a store item with missing cost', async () => {
    await expect(StoreItem.create({ itemId: '1', name: 'Item 1', type: 'A' })).rejects.toThrow();
  });

  it('should fail to create a store item with missing type', async () => {
    await expect(StoreItem.create({ itemId: '1', name: 'Item 1', cost: 10})).rejects.toThrow();
  });

  it('should fail to create a store item with duplicate itemId', async () => {
    const storeItem1 = new StoreItem({ itemId: '1', name: 'Item 1', cost: 10, type: 'A' });
    await storeItem1.save();
    const storeItem2 = new StoreItem({ itemId: '1', name: 'Item 2', cost: 20, type: 'B' });
    await expect(storeItem2.save()).rejects.toThrow();
  });

  it('should find a store item by itemId', async () => {
    const storeItem = new StoreItem({ itemId: '1', name: 'Item 1', cost: 10, type: 'A' });
    await storeItem.save();
    const foundItem = await StoreItem.findOne({ itemId: '1' });
    expect(foundItem.name).toBe('Item 1');
  });

  it('should not find a store item with non-existent itemId', async () => {
    const foundItem = await StoreItem.findOne({ itemId: '2' });
    expect(foundItem).toBeNull();
  });

  it('should update a store item', async () => {
    const storeItem = new StoreItem({ itemId: '1', name: 'Item 1', cost: 10, type: 'A' });
    await storeItem.save();
    await StoreItem.updateOne({ itemId: '1' }, { name: 'Updated Item' });
    const updatedItem = await StoreItem.findOne({ itemId: '1' });
    expect(updatedItem.name).toBe('Updated Item');
  });

  it('should delete a store item', async () => {
    const storeItem = new StoreItem({ itemId: '1', name: 'Item 1', cost: 10, type: 'A' });
    await storeItem.save();
    await StoreItem.deleteOne({ itemId: '1' });
    const deletedItem = await StoreItem.findOne({ itemId: '1' });
    expect(deletedItem).toBeNull();
  });

  it('should handle invalid cost', async () => {
    await expect(StoreItem.create({ itemId: '1', name: 'Item 1', cost: 'abc', type: 'A' })).rejects.toThrow();
  });

  it('should handle invalid type', async () => {
    await expect(StoreItem.create({ itemId: '1', name: 'Item 1', cost: 10, type: 123 })).rejects.toThrow();
  });
});
