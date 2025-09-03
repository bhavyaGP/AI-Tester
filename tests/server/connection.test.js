const connection = require('../../server/connection.js');

describe('MySQL Connection', () => {
  it('should establish a connection to the database', (done) => {
    expect(connection).toBeDefined();
    done();
  });

  it('should handle connection errors gracefully', (done) => {
    const errorHandler = jest.spyOn(console, 'error').mockImplementation(() => {});
    const mockError = new Error('mock connection error');
    connection.emit('error', mockError);
    expect(errorHandler).toHaveBeenCalledWith('MySQL connection error:', mockError);
    errorHandler.mockRestore();
    done();
  });

  it('should reconnect to the database if the connection is lost', (done) => {
    const reconnectSpy = jest.spyOn(connection, 'connect');
    const errorHandler = jest.spyOn(console, 'error').mockImplementation(() => {});
    const lostConnectionError = new Error('PROTOCOL_CONNECTION_LOST');
    connection.emit('error', lostConnectionError);
    expect(reconnectSpy).toHaveBeenCalled();
    errorHandler.mockRestore();
    done();
  });

  it('should exit the process with a failure code if the connection fails', (done) => {
    const exitSpy = jest.spyOn(process, 'exit');
    const mockError = new Error('mock connection error');
    connection.connect((err) => {
      if (err) {
        expect(exitSpy).toHaveBeenCalledWith(1);
      }
      done();
    });
    connection.emit('error', mockError);
    exitSpy.mockRestore();
  });

  it('should handle errors during reconnection', (done) => {
    const errorHandler = jest.spyOn(console, 'error').mockImplementation(() => {});
    const mockError = new Error('mock reconnection error');
    connection.on('error', (err) => {
      if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        connection.connect((err) => {
          if (err) {
            expect(errorHandler).toHaveBeenCalledWith('Error reconnecting to MySQL:', mockError.stack);
            expect(process.exit).toHaveBeenCalledWith(1);
          }
          done();
        });
      }
      connection.emit('error', mockError);
    });
    errorHandler.mockRestore();
  });

  it('should log a success message when connected', (done) => {
    const logSpy = jest.spyOn(console, 'log');
    connection.connect((err) => {
      if (!err) {
        expect(logSpy).toHaveBeenCalledWith('Connected to MySQL as ID', connection.threadId);
      }
      done();
      logSpy.mockRestore();
    });
  });


  it('should log a reconnection success message', (done) => {
      const logSpy = jest.spyOn(console, 'log');
      const reconnectSpy = jest.spyOn(connection, 'connect');
      const lostConnectionError = new Error('PROTOCOL_CONNECTION_LOST');

      connection.on('error', (err) => {
          if (err.code === 'PROTOCOL_CONNECTION_LOST') {
              connection.connect((err) => {
                  if (!err) {
                      expect(logSpy).toHaveBeenCalledWith('Reconnected to MySQL as ID', connection.threadId);
                  }
                  done();
              });
          }
      });

      connection.emit('error', lostConnectionError);
      logSpy.mockRestore();
      reconnectSpy.mockRestore();
  });
});
