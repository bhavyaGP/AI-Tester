const mongoose = require('mongoose');
const User = require('./path/to/your/userSchema'); // Replace with the actual path

describe('User Schema', () => {
  beforeAll(async () => {
    await mongoose.connect('mongodb://localhost:27017/testDatabase', { useNewUrlParser: true, useUnifiedTopology: true });
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it('should create a new user', async () => {
    const user = new User({ username: 'testuser', email: 'test@example.com', password: 'password123' });
    await user.save();
    expect(user._id).toBeDefined();
    expect(user.username).toBe('testuser');
    expect(user.email).toBe('test@example.com');
    expect(user.password).toBe('password123');
    expect(user.level).toBe(1);
    expect(user.coins).toBe(0);
    expect(user.toolsUnlocked).toEqual([]);
    expect(user.inventory).toEqual([]);
    expect(user.tasksCompleted).toEqual([]);
    expect(user.achievements).toEqual([]);
  });

  it('should not create a user with missing username', async () => {
    await expect(User.create({ email: 'test@example.com', password: 'password123' })).rejects.toThrow();
  });

  it('should not create a user with missing email', async () => {
    await expect(User.create({ username: 'testuser', password: 'password123' })).rejects.toThrow();
  });

  it('should not create a user with missing password', async () => {
    await expect(User.create({ username: 'testuser', email: 'test@example.com' })).rejects.toThrow();
  });

  it('should not create a user with duplicate email', async () => {
    await User.create({ username: 'testuser', email: 'test@example.com', password: 'password123' });
    await expect(User.create({ username: 'anotheruser', email: 'test@example.com', password: 'password123' })).rejects.toThrow();
  });

  it('should update user details', async () => {
    const user = await User.create({ username: 'updateuser', email: 'update@example.com', password: 'password123' });
    user.username = 'updateduser';
    user.level = 5;
    user.coins = 100;
    user.toolsUnlocked = ['multimeter', 'oscilloscope'];
    user.inventory = [{item: 'resistor', qty: 10}];
    user.tasksCompleted = ['task1', 'task2'];
    user.achievements = ['achievement1'];
    await user.save();
    const updatedUser = await User.findById(user._id);
    expect(updatedUser.username).toBe('updateduser');
    expect(updatedUser.level).toBe(5);
    expect(updatedUser.coins).toBe(100);
    expect(updatedUser.toolsUnlocked).toEqual(['multimeter', 'oscilloscope']);
    expect(updatedUser.inventory).toEqual([{item: 'resistor', qty: 10}]);
    expect(updatedUser.tasksCompleted).toEqual(['task1', 'task2']);
    expect(updatedUser.achievements).toEqual(['achievement1']);
  });


  it('should find a user by ID', async () => {
    const user = await User.create({ username: 'finduser', email: 'find@example.com', password: 'password123' });
    const foundUser = await User.findById(user._id);
    expect(foundUser._id.toString()).toBe(user._id.toString());
  });

  it('should find a user by email', async () => {
    const user = await User.create({ username: 'finduser', email: 'find2@example.com', password: 'password123' });
    const foundUser = await User.findOne({email: 'find2@example.com'});
    expect(foundUser._id.toString()).toBe(user._id.toString());
  });


  it('should delete a user', async () => {
    const user = await User.create({ username: 'deleteuser', email: 'delete@example.com', password: 'password123' });
    await User.findByIdAndDelete(user._id);
    const deletedUser = await User.findById(user._id);
    expect(deletedUser).toBeNull();
  });

});
