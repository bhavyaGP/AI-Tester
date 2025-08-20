const mongoose = require('mongoose');
const InventoryItem = require('./inventory-item'); 

jest.mock('mongoose');

describe('InventoryItem', () => {
  beforeEach(() => {
    mongoose.Schema.mockClear();
    mongoose.model.mockClear();
  });

  it('should create a new InventoryItem model', () => {
    expect(InventoryItem).toBeDefined();
  });

  it('should have the correct schema definition', () => {
    expect(mongoose.Schema).toHaveBeenCalledWith({
      itemId: { type: String, required: true, unique: true },
      name: { type: String, required: true },
      cost: { type: Number, required: true },
      effect: { type: String },
    });
  });

  it('should use the correct model name', () => {
    expect(mongoose.model).toHaveBeenCalledWith('InventoryItem', expect.any(mongoose.Schema));
  });


  it('should create a new InventoryItem document', async () => {
    const item = new InventoryItem({
      itemId: 'item1',
      name: 'Test Item',
      cost: 10,
      effect: 'Test Effect',
    });
    expect(item.itemId).toBe('item1');
    expect(item.name).toBe('Test Item');
    expect(item.cost).toBe(10);
    expect(item.effect).toBe('Test Effect');
  });

  it('should throw an error if itemId is not provided', async () => {
    expect(() => new InventoryItem({ name: 'Test Item', cost: 10 })).toThrow();
  });

  it('should throw an error if name is not provided', async () => {
    expect(() => new InventoryItem({ itemId: 'item1', cost: 10 })).toThrow();
  });

  it('should throw an error if cost is not provided', async () => {
    expect(() => new InventoryItem({ itemId: 'item1', name: 'Test Item' })).toThrow();
  });

  it('should handle null or undefined effect', async () => {
    const item1 = new InventoryItem({itemId: 'item1', name: 'Test Item', cost: 10, effect: null});
    const item2 = new InventoryItem({itemId: 'item2', name: 'Test Item 2', cost: 20});
    expect(item1.effect).toBe(null);
    expect(item2.effect).toBeUndefined();
  });


  it('should handle a cost of 0', async () => {
    const item = new InventoryItem({ itemId: 'item1', name: 'Test Item', cost: 0, effect: 'Test Effect' });
    expect(item.cost).toBe(0);
  });

  it('should handle a large cost', async () => {
    const item = new InventoryItem({itemId: 'item1', name: 'Test Item', cost: 1000000, effect: 'Test Effect'});
    expect(item.cost).toBe(1000000);
  });

  it('should handle an empty string effect', async () => {
    const item = new InventoryItem({itemId: 'item1', name: 'Test Item', cost: 10, effect: ''});
    expect(item.effect).toBe('');
  });

  it('should handle a very long string name', async () => {
    const longName = 'a'.repeat(1000);
    const item = new InventoryItem({itemId: 'item1', name: longName, cost: 10, effect: 'Test Effect'});
    expect(item.name).toBe(longName);
  });

  it('should handle a very long string itemId', async () => {
    const longId = 'a'.repeat(1000);
    const item = new InventoryItem({itemId: longId, name: 'Test Item', cost: 10, effect: 'Test Effect'});
    expect(item.itemId).toBe(longId);
  });

});
