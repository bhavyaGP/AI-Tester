const InventoryItem = require('../models/InventoryItem.model');
const StoreItem = require('../models/StoreItem.model');
const User = require('../models/user.model');
const { getPlayerInventory, buyItem, sellItem } = require('../controllers/inventoryController');

jest.mock('../models/user.model');
jest.mock('../models/StoreItem.model');

describe('getPlayerInventory', () => {
  it('should return the user inventory', async () => {
    const mockUser = { _id: '1', inventory: [{ item: '1', qty: 2 }] };
    User.findById.mockResolvedValue(mockUser);
    const req = { user: { _id: '1' } };
    const res = { json: jest.fn() };
    await getPlayerInventory(req, res);
    expect(res.json).toHaveBeenCalledWith([{ item: '1', qty: 2 }]);
  });
  it('should return an empty array if the user has no inventory', async () => {
    const mockUser = { _id: '1', inventory: [] };
    User.findById.mockResolvedValue(mockUser);
    const req = { user: { _id: '1' } };
    const res = { json: jest.fn() };
    await getPlayerInventory(req, res);
    expect(res.json).toHaveBeenCalledWith([]);
  });
  it('should handle errors', async () => {
    User.findById.mockRejectedValue(new Error('Failed to fetch user'));
    const req = { user: { _id: '1' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await getPlayerInventory(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch inventory' });
  });
});

describe('buyItem', () => {
  it('should buy an item', async () => {
    const mockUser = { _id: '1', coins: 100, inventory: [] };
    const mockItem = { itemId: '1', cost: 50 };
    User.findById.mockResolvedValue(mockUser);
    StoreItem.findOne.mockResolvedValue(mockItem);
    const req = { user: { _id: '1' }, body: { itemId: '1' } };
    const res = { json: jest.fn() };
    await buyItem(req, res);
    expect(User.findById).toHaveBeenCalledWith('1');
    expect(StoreItem.findOne).toHaveBeenCalledWith({ itemId: '1' });
    expect(res.json).toHaveBeenCalledWith({ message: 'Item bought', coins: 50, inventory: [{ item: '1', qty: 1 }] });
  });
  it('should handle item not found', async () => {
    User.findById.mockResolvedValue({ _id: '1', coins: 100, inventory: [] });
    StoreItem.findOne.mockResolvedValue(null);
    const req = { user: { _id: '1' }, body: { itemId: '1' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await buyItem(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Item not found' });
  });
  it('should handle not enough coins', async () => {
    const mockUser = { _id: '1', coins: 50, inventory: [] };
    const mockItem = { itemId: '1', cost: 100 };
    User.findById.mockResolvedValue(mockUser);
    StoreItem.findOne.mockResolvedValue(mockItem);
    const req = { user: { _id: '1' }, body: { itemId: '1' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await buyItem(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Not enough coins' });
  });
  it('should handle errors', async () => {
    User.findById.mockRejectedValue(new Error('Failed to buy item'));
    const req = { user: { _id: '1' }, body: { itemId: '1' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await buyItem(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to buy item' });
  });
});

describe('sellItem', () => {
  it('should sell an item', async () => {
    const mockUser = { _id: '1', coins: 0, inventory: [{ item: '1', qty: 2 }] };
    const mockItem = { itemId: '1', cost: 100 };
    User.findById.mockResolvedValue(mockUser);
    StoreItem.findOne.mockResolvedValue(mockItem);
    const req = { user: { _id: '1' }, body: { itemId: '1' } };
    const res = { json: jest.fn() };
    await sellItem(req, res);
    expect(res.json).toHaveBeenCalledWith({ message: 'Item sold', coins: 50, inventory: [{ item: '1', qty: 1 }] });
  });
  it('should handle item not found', async () => {
    User.findById.mockResolvedValue({ _id: '1', coins: 0, inventory: [{ item: '1', qty: 2 }] });
    StoreItem.findOne.mockResolvedValue(null);
    const req = { user: { _id: '1' }, body: { itemId: '1' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await sellItem(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Item not found' });
  });
  it('should handle item not in inventory', async () => {
    const mockUser = { _id: '1', coins: 0, inventory: [] };
    const mockItem = { itemId: '1', cost: 100 };
    User.findById.mockResolvedValue(mockUser);
    StoreItem.findOne.mockResolvedValue(mockItem);
    const req = { user: { _id: '1' }, body: { itemId: '1' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await sellItem(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Item not in inventory' });
  });
  it('should remove item from inventory if qty is 0', async () => {
    const mockUser = { _id: '1', coins: 0, inventory: [{ item: '1', qty: 1 }] };
    const mockItem = { itemId: '1', cost: 100 };
    User.findById.mockResolvedValue(mockUser);
    StoreItem.findOne.mockResolvedValue(mockItem);
    const req = { user: { _id: '1' }, body: { itemId: '1' } };
    const res = { json: jest.fn() };
    await sellItem(req, res);
    expect(res.json).toHaveBeenCalledWith({ message: 'Item sold', coins: 50, inventory: [] });
  });
  it('should handle errors', async () => {
    User.findById.mockRejectedValue(new Error('Failed to sell item'));
    const req = { user: { _id: '1' }, body: { itemId: '1' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await sellItem(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to sell item' });
  });
});
