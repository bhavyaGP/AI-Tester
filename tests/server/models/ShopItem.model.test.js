const mongoose = require('mongoose');
const ShopItem = require('./shopItem');

describe('ShopItem Model', () => {
  beforeAll(() => {
    return mongoose.connect('mongodb://localhost:27017/test', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  });

  afterAll(() => {
    return mongoose.disconnect();
  });

  afterEach(async () => {
    await ShopItem.deleteMany({});
  });

  it('should create a new ShopItem', async () => {
    const shopItem = new ShopItem({
      name: 'Test Item',
      price: 10,
    });
    await shopItem.save();
    expect(shopItem._id).toBeDefined();
    expect(shopItem.name).toBe('Test Item');
    expect(shopItem.price).toBe(10);
  });

  it('should throw an error if name is missing', async () => {
    const shopItem = new ShopItem({ price: 10 });
    await expect(shopItem.save()).rejects.toThrow();
  });

  it('should throw an error if price is missing', async () => {
    const shopItem = new ShopItem({ name: 'Test Item' });
    await expect(shopItem.save()).rejects.toThrow();
  });

  it('should create a new ShopItem with optional fields', async () => {
    const shopItem = new ShopItem({
      name: 'Test Item 2',
      price: 20,
      description: 'Test description',
      image: 'test.jpg',
    });
    await shopItem.save();
    expect(shopItem._id).toBeDefined();
    expect(shopItem.description).toBe('Test description');
    expect(shopItem.image).toBe('test.jpg');
  });

  it('should find a ShopItem by ID', async () => {
    const shopItem = new ShopItem({ name: 'Find Item', price: 30 });
    await shopItem.save();
    const foundItem = await ShopItem.findById(shopItem._id);
    expect(foundItem._id.toString()).toBe(shopItem._id.toString());
  });


  it('should handle finding a non-existent ShopItem', async () => {
    const foundItem = await ShopItem.findById('nonexistentId');
    expect(foundItem).toBeNull();
  });


  it('should update a ShopItem', async () => {
    const shopItem = new ShopItem({ name: 'Update Item', price: 40 });
    await shopItem.save();
    shopItem.name = 'Updated Name';
    await shopItem.save();
    const updatedItem = await ShopItem.findById(shopItem._id);
    expect(updatedItem.name).toBe('Updated Name');
  });

  it('should delete a ShopItem', async () => {
    const shopItem = new ShopItem({ name: 'Delete Item', price: 50 });
    await shopItem.save();
    await ShopItem.findByIdAndDelete(shopItem._id);
    const deletedItem = await ShopItem.findById(shopItem._id);
    expect(deletedItem).toBeNull();
  });

  it('should handle deleting a non-existent ShopItem', async () => {
    await expect(ShopItem.findByIdAndDelete('nonexistentId')).resolves.toBeNull();
  });

});
