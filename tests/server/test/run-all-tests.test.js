const { setupAndRunTests } = require('./index');

describe('runCommand', () => {
  it('should resolve if command succeeds', async () => {
    const mockSpawn = jest.fn().mockReturnValue({
      on: (event, cb) => {
        if (event === 'close') {
          cb(0);
        }
      },
    });
    const originalSpawn = spawn;
    spawn = mockSpawn;
    await runCommand('test');
    expect(mockSpawn).toHaveBeenCalledWith('test', [], { stdio: 'inherit', shell: true });
    spawn = originalSpawn;
  });
  it('should reject if command fails', async () => {
    const mockSpawn = jest.fn().mockReturnValue({
      on: (event, cb) => {
        if (event === 'close') {
          cb(1);
        }
      },
    });
    const originalSpawn = spawn;
    spawn = mockSpawn;
    await expect(runCommand('test')).rejects.toThrow('Command failed with code 1');
    spawn = originalSpawn;
  });
  it('should handle command errors', async () => {
    const mockSpawn = jest.fn().mockReturnValue({
      on: (event, cb) => {
        if (event === 'error') {
          cb(new Error('Spawn error'));
        }
      },
    });
    const originalSpawn = spawn;
    spawn = mockSpawn;
    await expect(runCommand('test')).rejects.toThrow('Spawn error');
    spawn = originalSpawn;
  });
});

describe('setupAndRunTests', () => {
  it('should complete successfully', async () => {
    const mockRunCommand = jest.fn();
    const originalRunCommand = runCommand;
    runCommand = mockRunCommand;
    const mockSpawn = jest.fn().mockReturnValue({ kill: jest.fn() });
    const originalSpawn = spawn;
    spawn = mockSpawn;
    await setupAndRunTests();
    expect(mockRunCommand).toHaveBeenCalled();
    expect(mockSpawn).toHaveBeenCalled();
    runCommand = originalRunCommand;
    spawn = originalSpawn;

  });
  it('should handle errors during setup', async () => {
    const mockRunCommand = jest.fn(() => Promise.reject(new Error('Test setup failed')));
    const originalRunCommand = runCommand;
    runCommand = mockRunCommand;
    const originalExit = process.exit;
    process.exit = jest.fn();
    await expect(setupAndRunTests()).rejects.toThrow('Test setup failed');
    expect(process.exit).toHaveBeenCalledWith(1);
    runCommand = originalRunCommand;
    process.exit = originalExit;

  });
});

describe('module exports', () => {
  it('should export setupAndRunTests', () => {
    expect(typeof setupAndRunTests).toBe('function');
  });
});
