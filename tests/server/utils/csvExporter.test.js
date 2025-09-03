const { objectsToCsv, csvToObjects } = require('../../server/utils/csvExporter.js');

describe('objectsToCsv', () => {
    it('should handle empty list', () => {
        expect(objectsToCsv([], ['name', 'age'])).toBe('\n');
    });
    it('should handle null values', () => {
        expect(objectsToCsv([{ name: 'John Doe', age: null }], ['name', 'age'])).toBe('name,age\nJohn Doe,\n');
    });
    it('should handle objects with commas and quotes', () => {
        expect(objectsToCsv([{ name: 'John "Doe", Jr.', age: '30' }], ['name', 'age'])).toBe('name,age\n"John ""Doe"", Jr.",30\n');
    });
    it('should handle objects with newlines', () => {
        expect(objectsToCsv([{ name: 'John\nDoe', age: '30' }], ['name', 'age'])).toBe('name,age\n"John\nDoe",30\n');
    });
    it('should handle different field orders', () => {
        expect(objectsToCsv([{ name: 'John Doe', age: '30' }], ['age', 'name'])).toBe('age,name\n30,John Doe\n');
    });
    it('should handle multiple objects', () => {
        expect(objectsToCsv([{ name: 'John Doe', age: '30' }, { name: 'Jane Doe', age: '25' }], ['name', 'age'])).toBe('name,age\nJohn Doe,30\nJane Doe,25\n');
    });
});

describe('csvToObjects', () => {
    it('should handle empty CSV', () => {
        expect(csvToObjects('')).toEqual([]);
    });
    it('should handle CSV with only header', () => {
        expect(csvToObjects('name,age')).toEqual([]);
    });
    it('should handle simple CSV', () => {
        expect(csvToObjects('name,age\nJohn Doe,30')).toEqual([{ name: 'John Doe', age: '30' }]);
    });
    it('should handle CSV with commas and quotes', () => {
        expect(csvToObjects('name,age\n"John Doe, Jr.",30')).toEqual([{ name: 'John Doe, Jr.', age: '30' }]);
    });
    it('should handle CSV with newlines', () => {
        expect(csvToObjects('name,age\n"John\nDoe",30')).toEqual([{ name: 'John\nDoe', age: '30' }]);
    });
    it('should handle CSV with escaped quotes', () => {
        expect(csvToObjects('name,age\n"John ""Doe""",30')).toEqual([{ name: 'John "Doe"', age: '30' }]);
    });
    it('should handle multiple rows', () => {
        expect(csvToObjects('name,age\nJohn Doe,30\nJane Doe,25')).toEqual([{ name: 'John Doe', age: '30' }, { name: 'Jane Doe', age: '25' }]);
    });
    it('should handle empty fields', () => {
        expect(csvToObjects('name,age\nJohn Doe,')).toEqual([{ name: 'John Doe', age: '' }]);
    });

});


describe('parseCsvLine', () => {
    it('should handle empty line', () => {
        expect(parseCsvLine('')).toEqual(['']);
    });
    it('should handle single field', () => {
        expect(parseCsvLine('John Doe')).toEqual(['John Doe']);
    });
    it('should handle multiple fields', () => {
        expect(parseCsvLine('John Doe,30')).toEqual(['John Doe', '30']);
    });
    it('should handle fields with commas', () => {
        expect(parseCsvLine('"John, Doe",30')).toEqual(['John, Doe', '30']);
    });
    it('should handle fields with quotes', () => {
        expect(parseCsvLine('"John \"Doe\"",30')).toEqual(['John "Doe"', '30']);
    });
    it('should handle fields with escaped quotes', () => {
        expect(parseCsvLine('"John ""Doe""",30')).toEqual(['John "Doe"', '30']);
    });
    it('should handle fields with newlines', () => {
        expect(parseCsvLine('"John\nDoe",30')).toEqual(['John\nDoe', '30']);
    });

});
