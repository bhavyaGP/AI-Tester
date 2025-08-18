describe('calculate', () => {

  // The function to be tested is assumed to be available in this scope,
  // e.g., imported or defined globally.
  // For context, the function being tested is:
  // function calculate(a, b, op) {
  //   if (op === 'add') return a + b;
  //   if (op === 'sub') return a - b;
  //   throw new Error('Invalid operation');
  // }

  describe('when op is "add"', () => {
    test('should correctly add two positive numbers', () => {
      expect(calculate(5, 3, 'add')).toBe(8);
    });

    test('should correctly add a positive and a negative number', () => {
      expect(calculate(10, -3, 'add')).toBe(7);
      expect(calculate(-7, 4, 'add')).toBe(-3);
    });

    test('should correctly add two negative numbers', () => {
      expect(calculate(-5, -3, 'add')).toBe(-8);
    });

    test('should correctly add with zero', () => {
      expect(calculate(0, 10, 'add')).toBe(10);
      expect(calculate(20, 0, 'add')).toBe(20);
      expect(calculate(0, 0, 'add')).toBe(0);
    });

    test('should correctly add decimal numbers', () => {
      expect(calculate(0.1, 0.2, 'add')).toBeCloseTo(0.3);
      expect(calculate(1.5, 2.75, 'add')).toBeCloseTo(4.25);
    });

    test('should handle large numbers correctly', () => {
      expect(calculate(1000000000, 2000000000, 'add')).toBe(3000000000);
      expect(calculate(Number.MAX_SAFE_INTEGER, 1, 'add')).toBe(Number.MAX_SAFE_INTEGER + 1);
    });

    test('should return NaN when adding NaN to a number', () => {
      expect(calculate(NaN, 5, 'add')).toBeNaN();
      expect(calculate(5, NaN, 'add')).toBeNaN();
    });

    test('should return Infinity when adding Infinity to a number', () => {
      expect(calculate(Infinity, 10, 'add')).toBe(Infinity);
      expect(calculate(10, Infinity, 'add')).toBe(Infinity);
    });

    test('should return Infinity when adding two Infinities', () => {
      expect(calculate(Infinity, Infinity, 'add')).toBe(Infinity);
    });

    test('should return NaN when adding positive and negative Infinity', () => {
      expect(calculate(Infinity, -Infinity, 'add')).toBeNaN();
    });
  });

  describe('when op is "sub"', () => {
    test('should correctly subtract two positive numbers', () => {
      expect(calculate(10, 3, 'sub')).toBe(7);
    });

    test('should correctly subtract a positive and a negative number', () => {
      expect(calculate(5, -3, 'sub')).toBe(8);
      expect(calculate(-5, 3, 'sub')).toBe(-8);
    });

    test('should correctly subtract two negative numbers', () => {
      expect(calculate(-5, -3, 'sub')).toBe(-2);
    });

    test('should correctly subtract with zero', () => {
      expect(calculate(0, 5, 'sub')).toBe(-5);
      expect(calculate(5, 0, 'sub')).toBe(5);
      expect(calculate(0, 0, 'sub')).toBe(0);
    });

    test('should correctly subtract decimal numbers', () => {
      expect(calculate(0.5, 0.2, 'sub')).toBeCloseTo(0.3);
      expect(calculate(4.25, 2.75, 'sub')).toBeCloseTo(1.5);
    });

    test('should handle large numbers correctly', () => {
      expect(calculate(3000000000, 1000000000, 'sub')).toBe(2000000000);
      expect(calculate(Number.MAX_SAFE_INTEGER, 1, 'sub')).toBe(Number.MAX_SAFE_INTEGER - 1);
    });

    test('should return NaN when subtracting NaN from a number', () => {
      expect(calculate(NaN, 5, 'sub')).toBeNaN();
      expect(calculate(5, NaN, 'sub')).toBeNaN();
    });

    test('should return Infinity when subtracting Infinity from a number', () => {
      expect(calculate(Infinity, 10, 'sub')).toBe(Infinity);
      expect(calculate(10, -Infinity, 'sub')).toBe(Infinity);
    });

    test('should return NaN when subtracting Infinity from Infinity', () => {
      expect(calculate(Infinity, Infinity, 'sub')).toBeNaN();
      expect(calculate(-Infinity, -Infinity, 'sub')).toBeNaN();
    });
  });

  describe('error handling for invalid operations', () => {
    test('should throw an "Invalid operation" error for an unknown string operation', () => {
      expect(() => calculate(1, 2, 'multiply')).toThrow('Invalid operation');
      expect(() => calculate(1, 2, 'divide')).toThrow('Invalid operation');
      expect(() => calculate(1, 2, 'power')).toThrow('Invalid operation');
    });

    test('should throw an "Invalid operation" error for an empty string operation', () => {
      expect(() => calculate(1, 2, '')).toThrow('Invalid operation');
    });

    test('should throw an "Invalid operation" error for undefined operation', () => {
      expect(() => calculate(1, 2, undefined)).toThrow('Invalid operation');
    });

    test('should throw an "Invalid operation" error for null operation', () => {
      expect(() => calculate(1, 2, null)).toThrow('Invalid operation');
    });

    test('should throw an "Invalid operation" error for non-string operation types', () => {
      expect(() => calculate(1, 2, 123)).toThrow('Invalid operation');
      expect(() => calculate(1, 2, true)).toThrow('Invalid operation');
      expect(() => calculate(1, 2, {})).toThrow('Invalid operation');
      expect(() => calculate(1, 2, [])).toThrow('Invalid operation');
    });
  });

  describe('type coercion and unusual inputs for a and b', () => {
    test('should handle string numbers for add due to JavaScript coercion', () => {
      expect(calculate('10', '5', 'add')).toBe(15);
      expect(calculate('10', 5, 'add')).toBe(15);
    });

    test('should handle string numbers for sub due to JavaScript coercion', () => {
      expect(calculate('10', '5', 'sub')).toBe(5);
      expect(calculate('10', 5, 'sub')).toBe(5);
    });

    test('should return NaN if a or b are non-numeric strings for add', () => {
      expect(calculate('hello', 5, 'add')).toBeNaN();
      expect(calculate(5, 'world', 'add')).toBeNaN();
    });

    test('should return NaN if a or b are non-numeric strings for sub', () => {
      expect(calculate('hello', 5, 'sub')).toBeNaN();
      expect(calculate(5, 'world', 'sub')).toBeNaN();
    });
  });
});