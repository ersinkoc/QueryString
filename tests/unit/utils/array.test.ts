import {
  parseArrayFormat,
  joinArrayFormat,
  isArrayKey,
  normalizeArrayKey,
  combineArrayValues,
  ensureArray,
  flattenArray,
  isSparseArray,
  compactArray
} from '../../../src/utils/array';

describe('Array utilities', () => {
  describe('parseArrayFormat', () => {
    it('should handle brackets format (returns value as-is)', () => {
      expect(parseArrayFormat('key[]', 'value', 'brackets')).toBe('value');
      expect(parseArrayFormat('key', 'value', 'brackets')).toBe('value');
    });

    it('should handle indices format (returns value as-is)', () => {
      expect(parseArrayFormat('key[0]', 'value', 'indices')).toBe('value');
      expect(parseArrayFormat('key', 'value', 'indices')).toBe('value');
    });

    it('should handle repeat format', () => {
      expect(parseArrayFormat('key', 'value', 'repeat')).toBe('value');
    });

    it('should handle comma format', () => {
      expect(parseArrayFormat('key', 'value1,value2,value3', 'comma')).toEqual(['value1', 'value2', 'value3']);
      expect(parseArrayFormat('key', 'single', 'comma')).toBe('single');
      expect(parseArrayFormat('key', 'value with spaces, another value', 'comma')).toEqual(['value with spaces', 'another value']);
    });

    it('should handle separator format', () => {
      expect(parseArrayFormat('key', 'value1|value2|value3', 'separator', '|')).toEqual(['value1', 'value2', 'value3']);
      expect(parseArrayFormat('key', 'single', 'separator', '|')).toBe('single');
      expect(parseArrayFormat('key', 'value1;value2;value3', 'separator', ';')).toEqual(['value1', 'value2', 'value3']);
    });

    it('should handle json format', () => {
      expect(parseArrayFormat('key', '["value1","value2","value3"]', 'json')).toEqual(['value1', 'value2', 'value3']);
      expect(parseArrayFormat('key', '"single"', 'json')).toBe('"single"'); // Returns original if not array
      expect(parseArrayFormat('key', 'invalid json', 'json')).toBe('invalid json');
    });

    it('should handle edge cases', () => {
      expect(parseArrayFormat('key', '', 'comma')).toBe('');
      expect(parseArrayFormat('key', 'value,', 'comma')).toEqual(['value', '']);
      expect(parseArrayFormat('key', ',value', 'comma')).toEqual(['', 'value']);
      expect(parseArrayFormat('key', ',,', 'comma')).toEqual(['', '', '']);
    });

    it('should handle array input', () => {
      expect(parseArrayFormat('key', ['already', 'array'], 'comma')).toEqual(['already', 'array']);
    });

    it('should handle non-string input', () => {
      expect(parseArrayFormat('key', 123 as any, 'comma')).toBe(123);
      expect(parseArrayFormat('key', null as any, 'comma')).toBe(null);
    });

    it('should handle bracket-separator format', () => {
      expect(parseArrayFormat('key', 'value1|value2|value3', 'bracket-separator', '|')).toEqual(['value1', 'value2', 'value3']);
      expect(parseArrayFormat('key', 'single', 'bracket-separator', '|')).toBe('single');
    });
  });

  describe('joinArrayFormat', () => {
    it('should handle brackets format', () => {
      expect(joinArrayFormat('key', ['value1', 'value2'], 'brackets')).toEqual([
        'key[]=value1',
        'key[]=value2'
      ]);
      expect(joinArrayFormat('key', [], 'brackets')).toEqual([]);
    });

    it('should handle indices format', () => {
      expect(joinArrayFormat('key', ['value1', 'value2'], 'indices')).toEqual([
        'key[0]=value1',
        'key[1]=value2'
      ]);
      expect(joinArrayFormat('key', [], 'indices')).toEqual([]);
    });

    it('should handle repeat format', () => {
      expect(joinArrayFormat('key', ['value1', 'value2'], 'repeat')).toEqual([
        'key=value1',
        'key=value2'
      ]);
      expect(joinArrayFormat('key', [], 'repeat')).toEqual([]);
    });

    it('should handle comma format', () => {
      expect(joinArrayFormat('key', ['value1', 'value2', 'value3'], 'comma')).toEqual([
        'key=value1,value2,value3'
      ]);
      expect(joinArrayFormat('key', [], 'comma')).toEqual([]);
      expect(joinArrayFormat('key', ['single'], 'comma')).toEqual(['key=single']);
    });

    it('should handle separator format', () => {
      expect(joinArrayFormat('key', ['value1', 'value2'], 'separator', '|')).toEqual([
        'key=value1|value2'
      ]);
      expect(joinArrayFormat('key', ['value1', 'value2'], 'separator', ';')).toEqual([
        'key=value1;value2'
      ]);
      expect(joinArrayFormat('key', [], 'separator', '|')).toEqual([]);
    });

    it('should handle json format', () => {
      expect(joinArrayFormat('key', ['value1', 'value2'], 'json')).toEqual([
        'key=["value1","value2"]'
      ]);
      expect(joinArrayFormat('key', [], 'json')).toEqual([]); // Empty arrays return empty array
      expect(joinArrayFormat('key', [{ nested: 'object' }], 'json')).toEqual([
        'key=[{"nested":"object"}]'
      ]);
    });

    it('should handle special characters in values', () => {
      expect(joinArrayFormat('key', ['value with spaces', 'value,with,commas'], 'comma')).toEqual([
        'key=value with spaces,value,with,commas'
      ]);
      expect(joinArrayFormat('key', ['value|with|pipes'], 'separator', '|')).toEqual([
        'key=value|with|pipes'
      ]);
    });

    it('should handle empty and null values', () => {
      expect(joinArrayFormat('key', ['', 'value', null as any], 'comma')).toEqual([
        'key=,value,' // null becomes empty string when joined
      ]);
      expect(joinArrayFormat('key', [undefined as any, 'value'], 'comma')).toEqual([
        'key=,value' // undefined becomes empty string when joined
      ]);
    });

    it('should use default separator when not provided', () => {
      expect(joinArrayFormat('key', ['value1', 'value2'], 'separator')).toEqual([
        'key=value1,value2'
      ]);
    });

    it('should handle bracket-separator format', () => {
      expect(joinArrayFormat('key', ['value1', 'value2'], 'bracket-separator', '|')).toEqual([
        'key[]=value1|value2'
      ]);
      expect(joinArrayFormat('key', [], 'bracket-separator')).toEqual([]);
    });

    it('should handle default format fallback', () => {
      expect(joinArrayFormat('key', ['value1', 'value2'], 'unknown-format' as any)).toEqual([
        'key=value1',
        'key=value2'
      ]);
    });
  });

  describe('isArrayKey', () => {
    it('should detect brackets format keys', () => {
      expect(isArrayKey('key[]', 'brackets')).toBe(true);
      expect(isArrayKey('key', 'brackets')).toBe(false);
      expect(isArrayKey('key[something]', 'brackets')).toBe(false);
    });

    it('should detect indices format keys', () => {
      expect(isArrayKey('key[0]', 'indices')).toBe(true);
      expect(isArrayKey('key[123]', 'indices')).toBe(true);
      expect(isArrayKey('key[]', 'indices')).toBe(false);
      expect(isArrayKey('key[abc]', 'indices')).toBe(false);
    });

    it('should return false for other formats', () => {
      expect(isArrayKey('key[]', 'repeat')).toBe(false);
      expect(isArrayKey('key[0]', 'comma')).toBe(false);
    });
  });

  describe('normalizeArrayKey', () => {
    it('should normalize brackets format keys', () => {
      expect(normalizeArrayKey('key[]', 'brackets')).toBe('key');
      expect(normalizeArrayKey('key', 'brackets')).toBe('key');
    });

    it('should normalize indices format keys', () => {
      expect(normalizeArrayKey('key[0]', 'indices')).toBe('key');
      expect(normalizeArrayKey('key[123]', 'indices')).toBe('key');
      expect(normalizeArrayKey('key', 'indices')).toBe('key');
    });

    it('should return key as-is for other formats', () => {
      expect(normalizeArrayKey('key[]', 'repeat')).toBe('key[]');
      expect(normalizeArrayKey('key[0]', 'comma')).toBe('key[0]');
    });
  });

  describe('combineArrayValues', () => {
    it('should return new value when existing is undefined', () => {
      expect(combineArrayValues(undefined, 'new')).toBe('new');
      expect(combineArrayValues(undefined, ['new'])).toEqual(['new']);
    });

    it('should concatenate arrays', () => {
      expect(combineArrayValues(['a', 'b'], ['c', 'd'])).toEqual(['a', 'b', 'c', 'd']);
    });

    it('should add value to existing array', () => {
      expect(combineArrayValues(['a', 'b'], 'c')).toEqual(['a', 'b', 'c']);
    });

    it('should add array to existing value', () => {
      expect(combineArrayValues('a', ['b', 'c'])).toEqual(['a', 'b', 'c']);
    });

    it('should combine two values into array', () => {
      expect(combineArrayValues('a', 'b')).toEqual(['a', 'b']);
    });
  });

  describe('ensureArray', () => {
    it('should return array as-is', () => {
      expect(ensureArray(['a', 'b'])).toEqual(['a', 'b']);
    });

    it('should wrap non-array in array', () => {
      expect(ensureArray('value')).toEqual(['value']);
      expect(ensureArray(123)).toEqual([123]);
      expect(ensureArray(null)).toEqual([null]);
    });
  });

  describe('flattenArray', () => {
    it('should flatten nested arrays', () => {
      expect(flattenArray([1, [2, 3], [4, [5, 6]]])).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it('should handle empty arrays', () => {
      expect(flattenArray([])).toEqual([]);
      expect(flattenArray([[], []])).toEqual([]);
    });

    it('should handle deeply nested arrays', () => {
      expect(flattenArray([1, [2, [3, [4, [5]]]]])).toEqual([1, 2, 3, 4, 5]);
    });

    it('should preserve non-array values', () => {
      expect(flattenArray(['a', 'b', ['c', 'd']])).toEqual(['a', 'b', 'c', 'd']);
    });
  });

  describe('isSparseArray', () => {
    it('should detect sparse arrays', () => {
      const sparse = new Array(5);
      sparse[0] = 'a';
      sparse[4] = 'e';
      expect(isSparseArray(sparse)).toBe(true);
    });

    it('should return false for dense arrays', () => {
      expect(isSparseArray(['a', 'b', 'c'])).toBe(false);
      expect(isSparseArray([])).toBe(false);
    });

    it('should detect arrays with deleted elements', () => {
      const arr = ['a', 'b', 'c'];
      delete arr[1];
      expect(isSparseArray(arr)).toBe(true);
    });
  });

  describe('compactArray', () => {
    it('should remove null and undefined values', () => {
      expect(compactArray(['a', null, 'b', undefined, 'c'])).toEqual(['a', 'b', 'c']);
    });

    it('should preserve other falsy values', () => {
      expect(compactArray(['a', '', 0, false, 'b'])).toEqual(['a', '', 0, false, 'b']);
    });

    it('should handle empty arrays', () => {
      expect(compactArray([])).toEqual([]);
    });

    it('should handle arrays with only null/undefined', () => {
      expect(compactArray([null, undefined, null])).toEqual([]);
    });
  });
});