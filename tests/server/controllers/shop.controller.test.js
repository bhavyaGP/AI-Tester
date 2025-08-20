const ShopItem = require("../models/ShopItem.model");
const Inventory = require("../models/Inventory.model");
const StoreItem = require('../models/StoreItem.model');
const { listItems, buyItem, getStoreItems } = require('../controllers/shopController');

jest.mock('../models/ShopItem.model');
jest.mock('../models/Inventory.model');
jest.mock('../models/StoreItem.model');

describe('listItems', () => {
  it('should return a list of shop items', async () => {
    ShopItem.find.mockResolvedValue([{ name: 'item1' }, { name: 'item2' }]);
    const req = {};
    const res = { json: jest.fn() };
    await listItems(req, res);
    expect(res.json).toHaveBeenCalledWith([{ name: 'item1' }, { name: 'item2' }]);
  });
  it('should handle errors', async () => {
    ShopItem.find.mockRejectedValue(new Error('Failed to fetch shop items'));
    const req = {};
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await listItems(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch shop items' });
  });
});

describe('buyItem', () => {
  it('should buy an item successfully', async () => {
    const req = { body: { itemId: 'itemId1' }, user: { _id: 'userId1' } };
    const item = { name: 'item1' };
    ShopItem.findById.mockResolvedValue(item);
    const inventory = { user: 'userId1', tools: [] };
    Inventory.findOne.mockResolvedValue(inventory);
    Inventory.prototype.save.mockResolvedValue(inventory);
    const res = { json: jest.fn() };
    await buyItem(req, res);
    expect(res.json).toHaveBeenCalledWith({ message: "Item bought successfully", tools: ['item1'] });
  });
  it('should handle item not found', async () => {
    const req = { body: { itemId: 'itemId1' }, user: { _id: 'userId1' } };
    ShopItem.findById.mockResolvedValue(null);
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await buyItem(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Item not found' });
  });
  it('should handle errors', async () => {
    const req = { body: { itemId: 'itemId1' }, user: { _id: 'userId1' } };
    ShopItem.findById.mockRejectedValue(new Error('Failed to buy item'));
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await buyItem(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to buy item' });
  });
  it('should add item to existing inventory', async () => {
    const req = { body: { itemId: 'itemId1' }, user: { _id: 'userId1' } };
    const item = { name: 'item1' };
    ShopItem.findById.mockResolvedValue(item);
    const inventory = { user: 'userId1', tools: ['item2'] };
    Inventory.findOne.mockResolvedValue(inventory);
    Inventory.prototype.save.mockResolvedValue(inventory);
    const res = { json: jest.fn() };
    await buyItem(req, res);
    expect(Inventory.prototype.save).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ message: "Item bought successfully", tools: ['item2', 'item1'] });
  });
});

describe('getStoreItems', () => {
  it('should return a list of store items', async () => {
    StoreItem.find.mockResolvedValue([{ name: 'item3' }, { name: 'item4' }]);
    const req = {};
    const res = { json: jest.fn() };
    await getStoreItems(req, res);
    expect(res.json).toHaveBeenCalledWith([{ name: 'item3' }, { name: 'item4' }]);
  });
  it('should handle errors', async () => {
    StoreItem.find.mockRejectedValue(new Error('Failed to fetch store items'));
    const req = {};
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await getStoreItems(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch store items' });
  });
});
