function calculate(a, b, op) {
  if (op === 'add') return a + b;
  if (op === 'sub') return a - b;
  if (op === 'mul') return a * b;
  throw new Error('Invalid operation');
}

describe('calculate', () => {
  describe('when op is "add"', () => {
    test('should correctly add two positive integers', () => {
      expect(calculate(5, 3, 'add')).toBe(8);
    });

    test('should correctly add two negative integers', () => {
      expect(calculate(-5, -3, 'add')).toBe(-8);
    });

    test('should correctly add a positive and a negative integer', () => {
      expect(calculate(5, -3, 'add')).toBe(2);
      expect(calculate(-5, 3, 'add')).toBe(-2);
    });

    test('should correctly add with zero', () => {
      expect(calculate(0, 5, 'add')).toBe(5);
      expect(calculate(5, 0, 'add')).toBe(5);
      expect(calculate(0, 0, 'add')).toBe(0);
    });

    test('should handle floating point numbers correctly', () => {
      expect(calculate(0.1, 0.2, 'add')).toBeCloseTo(0.3);
      expect(calculate(1.5, 2.75, 'add')).toBeCloseTo(4.25);
    });

    test('should handle large numbers without overflow (within JS limits)', () => {
      expect(calculate(Number.MAX_SAFE_INTEGER, 1, 'add')).toBe(Number.MAX_SAFE_INTEGER + 1);
    });
  });

  describe('when op is "sub"', () => {
    test('should correctly subtract two positive integers', () => {
      expect(calculate(5, 3, 'sub')).toBe(2);
      expect(calculate(3, 5, 'sub')).toBe(-2);
    });

    test('should correctly subtract two negative integers', () => {
      expect(calculate(-5, -3, 'sub')).toBe(-2);
      expect(calculate(-3, -5, 'sub')).toBe(2);
    });

    test('should correctly subtract a positive and a negative integer', () => {
      expect(calculate(5, -3, 'sub')).toBe(8);
      expect(calculate(-5, 3, 'sub')).toBe(-8);
    });

    test('should correctly subtract with zero', () => {
      expect(calculate(0, 5, 'sub')).toBe(-5);
      expect(calculate(5, 0, 'sub')).toBe(5);
      expect(calculate(0, 0, 'sub')).toBe(0);
    });

    test('should handle floating point numbers correctly', () => {
      expect(calculate(0.3, 0.1, 'sub')).toBeCloseTo(0.2);
      expect(calculate(2.75, 1.5, 'sub')).toBeCloseTo(1.25);
    });
  });

  describe('when op is "mul"', () => {
    test('should correctly multiply two positive integers', () => {
      expect(calculate(5, 3, 'mul')).toBe(15);
    });

    test('should correctly multiply two negative integers', () => {
      expect(calculate(-5, -3, 'mul')).toBe(15);
    });

    test('should correctly multiply a positive and a negative integer', () => {
      expect(calculate(5, -3, 'mul')).toBe(-15);
      expect(calculate(-5, 3, 'mul')).toBe(-15);
    });

    test('should correctly multiply by zero', () => {
      expect(calculate(5, 0, 'mul')).toBe(0);
      expect(calculate(0, 5, 'mul')).toBe(0);
      expect(calculate(0, 0, 'mul')).toBe(0);
    });

    test('should correctly multiply by one', () => {
      expect(calculate(5, 1, 'mul')).toBe(5);
      expect(calculate(1, 5, 'mul')).toBe(5);
    });

    test('should handle floating point numbers correctly', () => {
      expect(calculate(0.5, 0.2, 'mul')).toBeCloseTo(0.1);
      expect(calculate(2.5, 1.5, 'mul')).toBeCloseTo(3.75);
    });
  });

  describe('error handling for invalid operations', () => {
    test('should throw an error for an unrecognized operation string', () => {
      expect(() => calculate(1, 2, 'divide')).toThrow('Invalid operation');
      expect(() => calculate(1, 2, 'mod')).toThrow('Invalid operation');
      expect(() => calculate(1, 2, 'unknown')).toThrow('Invalid operation');
    });

    test('should throw an error for an empty operation string', () => {
      expect(() => calculate(1, 2, '')).toThrow('Invalid operation');
    });

    test('should throw an error for null operation', () => {
      expect(() => calculate(1, 2, null)).toThrow('Invalid operation');
    });

    test('should throw an error for undefined operation', () => {
      expect(() => calculate(1, 2, undefined)).toThrow('Invalid operation');
    });

    test('should throw an error for non-string operation type (number)', () => {
      expect(() => calculate(1, 2, 123)).toThrow('Invalid operation');
    });

    test('should throw an error for non-string operation type (boolean)', () => {
      expect(() => calculate(1, 2, true)).toThrow('Invalid operation');
    });

    test('should throw an error for non-string operation type (object)', () => {
      expect(() => calculate(1, 2, {})).toThrow('Invalid operation');
    });
  });
});