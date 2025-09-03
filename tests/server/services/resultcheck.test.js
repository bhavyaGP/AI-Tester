const resultcheck = require('../../server/services/resultcheck.js');

describe('resultcheck', () => {
  it('should set and get result status correctly', () => {
    resultcheck.setResultStatus(true);
    expect(resultcheck.getResultStatus()).toBe(true);
    resultcheck.setResultStatus(false);
    expect(resultcheck.getResultStatus()).toBe(false);
  });

  it('should handle initial status correctly', () => {
    expect(resultcheck.getResultStatus()).toBe(false);
  });

  it('should handle different boolean values correctly', () => {
    resultcheck.setResultStatus(true);
    expect(resultcheck.getResultStatus()).toBe(true);
    resultcheck.setResultStatus(false);
    expect(resultcheck.getResultStatus()).toBe(false);
    resultcheck.setResultStatus(1);
    expect(resultcheck.getResultStatus()).toBe(true);
    resultcheck.setResultStatus(0);
    expect(resultcheck.getResultStatus()).toBe(false);
    resultcheck.setResultStatus("true");
    expect(resultcheck.getResultStatus()).toBe(true);
    resultcheck.setResultStatus("false");
    expect(resultcheck.getResultStatus()).toBe(false);
  });

  it('should handle null and undefined values', () => {
    resultcheck.setResultStatus(null);
    expect(resultcheck.getResultStatus()).toBe(false);
    resultcheck.setResultStatus(undefined);
    expect(resultcheck.getResultStatus()).toBe(false);
  });


});
