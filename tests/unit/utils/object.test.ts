import {
  isObject,
  hasOwn,
  merge,
  assignSymbols,
  toPlainObject,
  getDepth,
  flattenObject,
  unflattenObject
} from '../../../src/utils/object';

describe('Object utilities', () => {
  describe('isObject', () => {
    it('should return true for objects', () => {
      expect(isObject({})).toBe(true);
      expect(isObject({ foo: 'bar' })).toBe(true);
    });

    it('should return false for non-objects', () => {
      expect(isObject(null)).toBe(false);
      expect(isObject(undefined)).toBe(false);
      expect(isObject('string')).toBe(false);
      expect(isObject(123)).toBe(false);
      expect(isObject([])).toBe(false);
      expect(isObject(new Date())).toBe(true); // Date is an object
    });
  });

  describe('hasOwn', () => {
    it('should return true for own properties', () => {
      const obj = { foo: 'bar' };
      expect(hasOwn(obj, 'foo')).toBe(true);
    });

    it('should return false for inherited properties', () => {
      const obj = Object.create({ inherited: 'value' });
      expect(hasOwn(obj, 'inherited')).toBe(false);
    });

    it('should return false for non-existent properties', () => {
      const obj = { foo: 'bar' };
      expect(hasOwn(obj, 'baz')).toBe(false);
    });
  });

  describe('merge', () => {
    it('should return target when source is falsy', () => {
      const target = { foo: 'bar' };
      expect(merge(target, null as any)).toBe(target);
      expect(merge(target, undefined as any)).toBe(target);
    });

    it('should handle non-object source with array target', () => {
      const target = [] as any;
      const source = 'string' as any;
      const result = merge(target, source);
      expect(result).toEqual(['string']);
    });

    it('should handle non-object source with object target', () => {
      const target = { existing: 'value' };
      const source = 'string' as any;
      const result = merge(target, source);
      // String has 6 characters, so it gets key '6'
      expect(result).toHaveProperty('6', 'string');
      expect(result).toHaveProperty('existing', 'value');
    });

    it('should handle non-object source with non-object target', () => {
      const target = 'target' as any;
      const source = 'source' as any;
      const result = merge(target, source);
      expect(result).toEqual(['target', 'source']);
    });

    it('should handle non-object target with object source', () => {
      const target = 'target' as any;
      const source = { foo: 'bar' };
      const result = merge(target, source);
      expect(result).toEqual({ 0: 'target', foo: 'bar' });
    });

    it('should handle array source with non-array target', () => {
      const target = { existing: 'value' };
      const source = ['item1', 'item2'] as any;
      const result = merge(target, source);
      // Array has length 2, so it gets key '2'
      expect(result).toEqual({ '2': ['item1', 'item2'], existing: 'value' });
    });

    it('should merge object properties', () => {
      const target = { a: 1, b: 2 };
      const source = { b: 3, c: 4 };
      const result = merge(target, source);
      expect(result).toEqual({ a: 1, b: 3, c: 4 });
    });

    it('should concatenate arrays', () => {
      const target = { arr: [1, 2] };
      const source = { arr: [3, 4] };
      const result = merge(target, source);
      expect(result).toEqual({ arr: [1, 2, 3, 4] });
    });

    it('should merge nested objects', () => {
      const target = { nested: { a: 1, b: 2 } };
      const source = { nested: { b: 3, c: 4 } };
      const result = merge(target, source);
      expect(result).toEqual({ nested: { a: 1, b: 3, c: 4 } });
    });

    it('should handle allowPrototypes option', () => {
      const target = { existing: 'value' };
      const source = { constructor: 'malicious' } as any;
      
      // Without allowPrototypes (default) - constructor property exists so it gets merged
      const result1 = merge(target, source);
      expect(result1).toEqual({ existing: 'value', constructor: 'malicious' });
      
      // With allowPrototypes explicitly true
      const result2 = merge(target, source, { allowPrototypes: true });
      expect(result2).toEqual({ existing: 'value', constructor: 'malicious' });
    });

    it('should handle array source with object target edge case', () => {
      const target = { existing: 'value' };
      const source = ['item1', 'item2'];
      
      // Test the specific line 36 that returns source directly when it's an object
      const result = merge(target as any, source as any);
      // Array sources go through non-object path due to isObject check
      expect(result).toEqual({ '2': ['item1', 'item2'], existing: 'value' });
    });

    it('should handle array merge scenarios', () => {
      // Test various array merge scenarios
      const target1 = { existing: 'value' };
      const source1 = ['item1', 'item2'];
      
      const result1 = merge(target1, source1 as any);
      expect(result1).toHaveProperty('existing');
      
      // Test array to array merge
      const target2 = ['a', 'b'];
      const source2 = ['c', 'd'];
      const result2 = merge(target2 as any, source2 as any);
      expect(Array.isArray(result2)).toBe(true);
    });
  });

  describe('assignSymbols', () => {
    it('should assign symbol properties', () => {
      const sym1 = Symbol('test1');
      const sym2 = Symbol('test2');
      const target = {};
      const source = { [sym1]: 'value1', [sym2]: 'value2' };
      
      const result = assignSymbols(target, source);
      expect(result[sym1]).toBe('value1');
      expect(result[sym2]).toBe('value2');
    });

    it('should not affect string properties', () => {
      const sym = Symbol('test');
      const target = { foo: 'bar' };
      const source = { [sym]: 'value', baz: 'qux' };
      
      const result = assignSymbols(target, source);
      expect(result[sym]).toBe('value');
      expect(result).toHaveProperty('foo', 'bar');
      expect(result).not.toHaveProperty('baz'); // only symbols are copied
    });
  });

  describe('toPlainObject', () => {
    it('should convert object to plain object', () => {
      const obj = { foo: 'bar', baz: 'qux' };
      const result = toPlainObject(obj);
      expect(result).toEqual({ foo: 'bar', baz: 'qux' });
    });

    it('should handle non-objects', () => {
      expect(toPlainObject('string')).toEqual({});
      expect(toPlainObject(123)).toEqual({});
      expect(toPlainObject(null)).toEqual({});
      expect(toPlainObject(undefined)).toEqual({});
    });

    it('should only include own properties', () => {
      const proto = { inherited: 'value' };
      const obj = Object.create(proto);
      obj.own = 'property';
      
      const result = toPlainObject(obj);
      expect(result).toEqual({ own: 'property' });
      expect(result).not.toHaveProperty('inherited');
    });
  });

  describe('getDepth', () => {
    it('should return 0 for non-objects', () => {
      expect(getDepth('string')).toBe(0);
      expect(getDepth(123)).toBe(0);
      expect(getDepth(null)).toBe(0);
      expect(getDepth(undefined)).toBe(0);
    });

    it('should return current depth for empty objects', () => {
      expect(getDepth({})).toBe(0);
      expect(getDepth([], 2)).toBe(2);
    });

    it('should calculate depth for nested objects', () => {
      const obj = { a: { b: { c: 'value' } } };
      expect(getDepth(obj)).toBe(3);
    });

    it('should calculate depth for arrays', () => {
      const arr = [1, [2, [3, 4]]];
      expect(getDepth(arr)).toBe(3);
    });

    it('should calculate depth for mixed structures', () => {
      const obj = { a: [{ b: { c: 'value' } }] };
      expect(getDepth(obj)).toBe(4);
    });

    it('should return maximum depth', () => {
      const obj = { 
        shallow: 'value',
        deep: { a: { b: { c: 'deepest' } } }
      };
      expect(getDepth(obj)).toBe(4);
    });
  });

  describe('flattenObject', () => {
    it('should flatten simple objects', () => {
      const obj = { a: 1, b: 2 };
      const result = flattenObject(obj);
      expect(result).toEqual({ a: 1, b: 2 });
    });

    it('should flatten nested objects with bracket notation', () => {
      const obj = { a: { b: { c: 'value' } } };
      const result = flattenObject(obj);
      expect(result).toEqual({ 'a[b][c]': 'value' });
    });

    it('should flatten nested objects with dot notation', () => {
      const obj = { a: { b: { c: 'value' } } };
      const result = flattenObject(obj, '', true);
      expect(result).toEqual({ 'a.b.c': 'value' });
    });

    it('should flatten arrays', () => {
      const obj = { items: ['a', 'b', 'c'] };
      const result = flattenObject(obj);
      expect(result).toEqual({
        'items[0]': 'a',
        'items[1]': 'b',
        'items[2]': 'c'
      });
    });

    it('should flatten complex nested structures', () => {
      const obj = { 
        user: { 
          name: 'John',
          tags: ['admin', 'user']
        }
      };
      const result = flattenObject(obj);
      expect(result).toEqual({
        'user[name]': 'John',
        'user[tags][0]': 'admin',
        'user[tags][1]': 'user'
      });
    });

    it('should handle prefix', () => {
      const obj = { a: 1, b: 2 };
      const result = flattenObject(obj, 'prefix');
      expect(result).toEqual({
        'prefix[a]': 1,
        'prefix[b]': 2
      });
    });

    it('should flatten arrays containing objects', () => {
      const obj = { items: [{ id: 1 }, { id: 2 }] };
      const result = flattenObject(obj);
      expect(result).toEqual({
        'items[0][id]': 1,
        'items[1][id]': 2
      });
    });
  });

  describe('unflattenObject', () => {
    it('should unflatten simple objects', () => {
      const obj = { a: 1, b: 2 };
      const result = unflattenObject(obj);
      expect(result).toEqual({ a: 1, b: 2 });
    });

    it('should unflatten bracket notation', () => {
      const obj = { 'a[b][c]': 'value' };
      const result = unflattenObject(obj);
      expect(result).toEqual({ a: { b: { c: 'value' } } });
    });

    it('should unflatten dot notation', () => {
      const obj = { 'a.b.c': 'value' };
      const result = unflattenObject(obj, true);
      expect(result).toEqual({ a: { b: { c: 'value' } } });
    });

    it('should unflatten arrays', () => {
      const obj = {
        'items[0]': 'a',
        'items[1]': 'b',
        'items[2]': 'c'
      };
      const result = unflattenObject(obj);
      expect(result).toEqual({ items: ['a', 'b', 'c'] });
    });

    it('should unflatten complex structures', () => {
      const obj = {
        'user[name]': 'John',
        'user[tags][0]': 'admin',
        'user[tags][1]': 'user'
      };
      const result = unflattenObject(obj);
      expect(result).toEqual({
        user: {
          name: 'John',
          tags: ['admin', 'user']
        }
      });
    });

    it('should handle mixed array and object indices', () => {
      const obj = {
        'items[0][id]': 1,
        'items[1][id]': 2
      };
      const result = unflattenObject(obj);
      expect(result).toEqual({
        items: [{ id: 1 }, { id: 2 }]
      });
    });
  });
});