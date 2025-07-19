import { QueryBuilder } from '../../src/builder';

describe('QueryBuilder', () => {
  describe('construction', () => {
    it('should create empty builder', () => {
      const builder = new QueryBuilder();
      expect(builder.toObject()).toEqual({});
    });

    it('should create builder with base URL', () => {
      const builder = new QueryBuilder({ baseUrl: 'https://example.com?foo=bar' });
      expect(builder.toObject()).toEqual({ foo: 'bar' });
    });

    it('should create builder from string', () => {
      const builder = QueryBuilder.from('foo=bar&baz=qux');
      expect(builder.toObject()).toEqual({ foo: 'bar', baz: 'qux' });
    });

    it('should create builder from object', () => {
      const builder = QueryBuilder.from({ foo: 'bar', baz: 'qux' });
      expect(builder.toObject()).toEqual({ foo: 'bar', baz: 'qux' });
    });

    it('should create builder from another builder', () => {
      const original = new QueryBuilder();
      original.add('foo', 'bar');
      const copy = QueryBuilder.from(original);
      expect(copy.toObject()).toEqual({ foo: 'bar' });
    });
  });

  describe('basic operations', () => {
    let builder: QueryBuilder;

    beforeEach(() => {
      builder = new QueryBuilder();
    });

    it('should add single values', () => {
      builder.add('foo', 'bar');
      expect(builder.get('foo')).toBe('bar');
    });

    it('should add multiple values', () => {
      builder.addMultiple({ foo: 'bar', baz: 'qux' });
      expect(builder.toObject()).toEqual({ foo: 'bar', baz: 'qux' });
    });

    it('should add arrays', () => {
      builder.addArray('items', [1, 2, 3]);
      expect(builder.get('items')).toEqual([1, 2, 3]);
    });

    it('should throw on non-array to addArray', () => {
      expect(() => builder.addArray('items', 'not-array' as any)).toThrow('Values must be an array');
    });

    it('should add objects', () => {
      builder.addObject('user', { name: 'John', age: 30 });
      expect(builder.get('user')).toEqual({ name: 'John', age: 30 });
    });

    it('should throw on non-object to addObject', () => {
      expect(() => builder.addObject('user', 'not-object' as any)).toThrow('Value must be an object');
    });

    it('should append values', () => {
      builder.append('tags', 'js');
      builder.append('tags', 'ts');
      expect(builder.get('tags')).toEqual(['js', 'ts']);
    });

    it('should append to existing array', () => {
      builder.add('tags', ['js']);
      builder.append('tags', 'ts');
      expect(builder.get('tags')).toEqual(['js', 'ts']);
    });

    it('should set values (alias for add)', () => {
      builder.set('foo', 'bar');
      expect(builder.get('foo')).toBe('bar');
    });

    it('should check if key exists', () => {
      builder.add('foo', 'bar');
      expect(builder.has('foo')).toBe(true);
      expect(builder.has('baz')).toBe(false);
    });

    it('should delete values', () => {
      builder.add('foo', 'bar');
      builder.delete('foo');
      expect(builder.has('foo')).toBe(false);
    });

    it('should clear all values', () => {
      builder.addMultiple({ foo: 'bar', baz: 'qux' });
      builder.clear();
      expect(builder.toObject()).toEqual({});
    });
  });

  describe('enumeration methods', () => {
    let builder: QueryBuilder;

    beforeEach(() => {
      builder = new QueryBuilder();
      builder.addMultiple({ foo: 'bar', baz: 'qux', num: 42 });
    });

    it('should get keys', () => {
      expect(builder.keys()).toEqual(['foo', 'baz', 'num']);
    });

    it('should get values', () => {
      expect(builder.values()).toEqual(['bar', 'qux', 42]);
    });

    it('should get entries', () => {
      expect(builder.entries()).toEqual([
        ['foo', 'bar'],
        ['baz', 'qux'],
        ['num', 42]
      ]);
    });

    it('should iterate with forEach', () => {
      const result: Array<[string, unknown]> = [];
      builder.forEach((value, key) => {
        result.push([key, value]);
      });
      expect(result).toEqual([
        ['foo', 'bar'],
        ['baz', 'qux'],
        ['num', 42]
      ]);
    });

    it('should map values', () => {
      const result = builder.map((value, key) => `${key}:${value}`);
      expect(result).toEqual(['foo:bar', 'baz:qux', 'num:42']);
    });

    it('should filter values', () => {
      const filtered = builder.filter((value) => typeof value === 'string');
      expect(filtered.toObject()).toEqual({ foo: 'bar', baz: 'qux' });
    });
  });

  describe('merge operations', () => {
    let builder: QueryBuilder;

    beforeEach(() => {
      builder = new QueryBuilder();
      builder.add('foo', 'bar');
    });

    it('should merge string', () => {
      builder.merge('baz=qux&num=42');
      expect(builder.toObject()).toEqual({ foo: 'bar', baz: 'qux', num: '42' });
    });

    it('should merge object', () => {
      builder.merge({ baz: 'qux', num: 42 });
      expect(builder.toObject()).toEqual({ foo: 'bar', baz: 'qux', num: 42 });
    });

    it('should merge another builder', () => {
      const other = new QueryBuilder();
      other.addMultiple({ baz: 'qux', num: 42 });
      builder.merge(other);
      expect(builder.toObject()).toEqual({ foo: 'bar', baz: 'qux', num: 42 });
    });
  });

  describe('utility methods', () => {
    let builder: QueryBuilder;

    beforeEach(() => {
      builder = new QueryBuilder();
    });

    it('should clone builder', () => {
      builder.add('foo', 'bar');
      const clone = builder.clone();
      clone.add('baz', 'qux');
      
      expect(builder.toObject()).toEqual({ foo: 'bar' });
      expect(clone.toObject()).toEqual({ foo: 'bar', baz: 'qux' });
    });

    it('should check if empty', () => {
      expect(builder.isEmpty()).toBe(true);
      builder.add('foo', 'bar');
      expect(builder.isEmpty()).toBe(false);
    });

    it('should get size', () => {
      expect(builder.size()).toBe(0);
      builder.addMultiple({ foo: 'bar', baz: 'qux' });
      expect(builder.size()).toBe(2);
    });

    it('should pick keys', () => {
      builder.addMultiple({ foo: 'bar', baz: 'qux', num: 42 });
      const picked = builder.pick('foo', 'num');
      expect(picked.toObject()).toEqual({ foo: 'bar', num: 42 });
    });

    it('should omit keys', () => {
      builder.addMultiple({ foo: 'bar', baz: 'qux', num: 42 });
      const omitted = builder.omit('baz');
      expect(omitted.toObject()).toEqual({ foo: 'bar', num: 42 });
    });
  });

  describe('transformation methods', () => {
    let builder: QueryBuilder;

    beforeEach(() => {
      builder = new QueryBuilder();
      builder.addMultiple({ foo: 'bar', num: '42' });
    });

    it('should transform query', () => {
      builder.transform((query) => {
        const transformed: any = {};
        for (const [key, value] of Object.entries(query)) {
          transformed[key.toUpperCase()] = value;
        }
        return transformed;
      });
      expect(builder.toObject()).toEqual({ FOO: 'bar', NUM: '42' });
    });

    it('should validate query', () => {
      expect(() => {
        builder.validate(() => true);
      }).not.toThrow();

      expect(() => {
        builder.validate(() => false);
      }).toThrow('Query validation failed');

      expect(() => {
        builder.validate(() => 'Custom error message');
      }).toThrow('Query validation failed: Custom error message');
    });
  });

  describe('conditional methods', () => {
    let builder: QueryBuilder;

    beforeEach(() => {
      builder = new QueryBuilder();
    });

    it('should execute when condition is true', () => {
      builder.when(true, (b) => b.add('foo', 'bar'));
      expect(builder.has('foo')).toBe(true);
    });

    it('should not execute when condition is false', () => {
      builder.when(false, (b) => b.add('foo', 'bar'));
      expect(builder.has('foo')).toBe(false);
    });

    it('should execute when function returns true', () => {
      builder.add('test', true);
      builder.when(
        (b) => b.get('test') === true,
        (b) => b.add('foo', 'bar')
      );
      expect(builder.has('foo')).toBe(true);
    });

    it('should execute unless condition is false', () => {
      builder.unless(false, (b) => b.add('foo', 'bar'));
      expect(builder.has('foo')).toBe(true);
    });

    it('should not execute unless condition is true', () => {
      builder.unless(true, (b) => b.add('foo', 'bar'));
      expect(builder.has('foo')).toBe(false);
    });

    it('should handle unless with function condition', () => {
      builder.add('existing', 'value');
      builder.unless((b) => b.has('existing'), (b) => b.add('foo', 'bar'));
      expect(builder.has('foo')).toBe(false); // foo should not be added
    });

    it('should handle unless with function condition when false', () => {
      builder.unless((b) => b.has('nonexistent'), (b) => b.add('foo', 'bar'));
      expect(builder.has('foo')).toBe(true); // foo should be added
    });

    it('should tap into builder', () => {
      let tapped = false;
      builder.tap(() => {
        tapped = true;
      });
      expect(tapped).toBe(true);
    });
  });

  describe('output methods', () => {
    let builder: QueryBuilder;

    beforeEach(() => {
      builder = new QueryBuilder();
      builder.addMultiple({ foo: 'bar', nums: [1, 2, 3] });
    });

    it('should convert to string', () => {
      expect(builder.toString()).toBe('foo=bar&nums=1&nums=2&nums=3');
    });

    it('should convert to string with options', () => {
      expect(builder.toString({ arrayFormat: 'brackets' })).toBe('foo=bar&nums[]=1&nums[]=2&nums[]=3');
    });

    it('should build (alias for toString)', () => {
      expect(builder.build()).toBe('foo=bar&nums=1&nums=2&nums=3');
    });

    it('should convert to URL', () => {
      const builderWithUrl = new QueryBuilder({ baseUrl: 'https://example.com' });
      builderWithUrl.add('foo', 'bar');
      expect(builderWithUrl.toUrl()).toBe('https://example.com?foo=bar');
    });

    it('should convert to URL with custom base', () => {
      expect(builder.toUrl('https://example.com')).toBe('https://example.com?foo=bar&nums=1&nums=2&nums=3');
    });

    it('should throw when no URL provided', () => {
      expect(() => builder.toUrl()).toThrow('No base URL provided');
    });

    it('should buildUrl (alias for toUrl)', () => {
      expect(builder.buildUrl('https://example.com')).toBe('https://example.com?foo=bar&nums=1&nums=2&nums=3');
    });
  });

  describe('static methods', () => {
    it('should parse string to builder', () => {
      const builder = QueryBuilder.parse('foo=bar&baz=qux');
      expect(builder.toObject()).toEqual({ foo: 'bar', baz: 'qux' });
    });

    it('should create builder with query', () => {
      const builder = QueryBuilder.create({ foo: 'bar', baz: 'qux' });
      expect(builder.toObject()).toEqual({ foo: 'bar', baz: 'qux' });
    });

    it('should create empty builder', () => {
      const builder = QueryBuilder.create();
      expect(builder.toObject()).toEqual({});
    });
  });
});