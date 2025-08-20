describe('Environment Variable Configuration', () => {
  test('NODE_ENV is set to "test"', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
  test('mongoUrl is defined', () => {
    expect(process.env.mongoUrl).toBeDefined();
  });
  test('mongoUrl defaults to localhost if not set', () => {
    process.env.mongoUrl = undefined;
    expect(process.env.mongoUrl).toBe("mongodb://localhost:27017/playpower_test");
    process.env.mongoUrl = "mongodb://localhost:27017/playpower_test";
  });
  test('JWT_SECRET is defined', () => {
    expect(process.env.JWT_SECRET).toBeDefined();
  });
  test('JWT_SECRET defaults to "keyboardcat" if not set', () => {
    process.env.JWT_SECRET = undefined;
    expect(process.env.JWT_SECRET).toBe("keyboardcat");
    process.env.JWT_SECRET = "keyboardcat";
  });
});

describe('Jest Timeout', () => {
  test('Timeout is increased to 30000ms', () => {
    expect(jest.getTimeout()).toBe(30000);
  });
});

describe('Console Logging', () => {
  test('console.log is not mocked', () => {
    expect(console.log).toBeDefined();
    expect(console.log).not.toBe(jest.fn());

  });
});
