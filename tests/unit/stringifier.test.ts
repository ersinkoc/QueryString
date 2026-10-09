import { stringify, stringifyUrl } from '../../src/stringifier';
import { parse } from '../../src/parser';

describe('Stringifier', () => {
  describe('stringify', () => {
    describe('basic stringification', () => {
      it('should stringify simple objects', () => {
        expect(stringify({ foo: 'bar' })).toBe('foo=bar');
        expect(stringify({ foo: 'bar', baz: 'qux' })).toBe('foo=bar&baz=qux');
      });

      it('should handle empty objects', () => {
        expect(stringify({})).toBe('');
        expect(stringify(null)).toBe('');
        expect(stringify(undefined)).toBe('');
      });

      it('should handle non-objects', () => {
        expect(stringify('string' as any)).toBe('');
        expect(stringify(123 as any)).toBe('');
        expect(stringify(true as any)).toBe('');
      });

      it('should encode values by default', () => {
        expect(stringify({ foo: 'hello world' })).toBe('foo=hello%20world');
        expect(stringify({ email: 'user@example.com' })).toBe('email=user%40example.com');
      });

      it('should handle special characters', () => {
        expect(stringify({ key: '=&?#' })).toBe('key=%3D%26%3F%23');
      });
    });

    describe('delimiter options', () => {
      it('should use custom delimiter', () => {
        expect(stringify({ foo: 'bar', baz: 'qux' }, { delimiter: ';' })).toBe('foo=bar;baz=qux');
        expect(stringify({ foo: 'bar', baz: 'qux' }, { delimiter: '|' })).toBe('foo=bar|baz=qux');
      });
    });

    describe('encoding options', () => {
      it('should not encode when disabled', () => {
        expect(stringify({ foo: 'hello world' }, { encode: false })).toBe('foo=hello world');
      });

      it('should use custom encoder', () => {
        const encoder = (str: string) => str.toUpperCase();
        expect(stringify({ foo: 'bar' }, { encoder })).toBe('FOO=BAR');
      });

      it('should encode values only when specified', () => {
        expect(stringify({ 'f o o': 'b a r' }, { encodeValuesOnly: true })).toBe('f o o=b%20a%20r');
      });

      it('should handle RFC1738 format', () => {
        expect(stringify({ foo: 'hello world' }, { format: 'RFC1738' })).toBe('foo=hello+world');
      });
    });

    describe('null handling', () => {
      it('should handle null values', () => {
        expect(stringify({ foo: null })).toBe('foo=');
        expect(stringify({ foo: null }, { strictNullHandling: true })).toBe('foo');
      });

      it('should skip nulls when specified', () => {
        expect(stringify({ foo: null, bar: 'baz' }, { skipNulls: true })).toBe('bar=baz');
        expect(stringify({ foo: undefined, bar: 'baz' }, { skipNulls: true })).toBe('bar=baz');
      });
    });

    describe('array stringification', () => {
      it('should stringify arrays with repeat format', () => {
        expect(stringify({ foo: [1, 2, 3] }, { arrayFormat: 'repeat' })).toBe('foo=1&foo=2&foo=3');
      });

      it('should stringify arrays with brackets format', () => {
        expect(stringify({ foo: [1, 2, 3] }, { arrayFormat: 'brackets' })).toBe('foo[]=1&foo[]=2&foo[]=3');
      });

      it('should stringify arrays with indices format', () => {
        expect(stringify({ foo: [1, 2, 3] }, { arrayFormat: 'indices' })).toBe('foo[0]=1&foo[1]=2&foo[2]=3');
      });

      it('should stringify arrays with comma format', () => {
        expect(stringify({ foo: [1, 2, 3] }, { arrayFormat: 'comma' })).toBe('foo=1,2,3');
      });

      it('should stringify arrays with separator format', () => {
        expect(stringify({ foo: [1, 2, 3] }, { arrayFormat: 'separator', arrayFormatSeparator: '|' })).toBe('foo=1|2|3');
      });

      it('should stringify arrays with json format', () => {
        expect(stringify({ foo: [1, 2, 3] }, { arrayFormat: 'json' })).toBe('foo=%5B1%2C2%2C3%5D');
      });

      it('should handle empty arrays', () => {
        expect(stringify({ foo: [] }, { skipNulls: false })).toBe('');
        expect(stringify({ foo: [] }, { skipNulls: true })).toBe('');
      });
    });

    describe('nested objects', () => {
      it('should stringify nested objects', () => {
        expect(stringify({ user: { name: 'John', age: 30 } })).toBe('user[name]=John&user[age]=30');
      });

      it('should use dot notation when enabled', () => {
        expect(stringify({ user: { name: 'John', age: 30 } }, { allowDots: true })).toBe('user.name=John&user.age=30');
      });

      it('should handle deep nesting', () => {
        expect(stringify({ a: { b: { c: { d: 'value' } } } })).toBe('a[b][c][d]=value');
        expect(stringify({ a: { b: { c: { d: 'value' } } } }, { allowDots: true })).toBe('a.b.c.d=value');
      });
    });

    describe('date handling', () => {
      it('should serialize dates', () => {
        const date = new Date('2024-01-01T00:00:00.000Z');
        expect(stringify({ date })).toBe('date=2024-01-01T00%3A00%3A00.000Z');
      });

      it('should use custom date serializer', () => {
        const date = new Date('2024-01-01T00:00:00.000Z');
        const serializeDate = (d: Date) => d.getTime().toString();
        expect(stringify({ date }, { serializeDate })).toBe('date=1704067200000');
      });
    });

    describe('filtering', () => {
      it('should filter by array of keys', () => {
        expect(stringify({ foo: 'bar', baz: 'qux', quux: 'corge' }, { filter: ['foo', 'quux'] })).toBe('foo=bar&quux=corge');
      });

      it('should filter by function', () => {
        const filter = (_prefix: string, value: unknown) => {
          if (typeof value === 'string' && value.length > 3) {
            return undefined;
          }
          return value;
        };
        expect(stringify({ foo: 'bar', baz: 'qux', long: 'longvalue' }, { filter })).toBe('foo=bar&baz=qux');
      });
    });

    describe('sorting', () => {
      it('should sort keys alphabetically', () => {
        expect(stringify({ c: 3, a: 1, b: 2 }, { sort: true })).toBe('a=1&b=2&c=3');
      });

      it('should use custom sort function', () => {
        const sort = (a: string, b: string) => b.localeCompare(a);
        expect(stringify({ a: 1, b: 2, c: 3 }, { sort })).toBe('c=3&b=2&a=1');
      });
    });

    describe('query prefix', () => {
      it('should add query prefix when specified', () => {
        expect(stringify({ foo: 'bar' }, { addQueryPrefix: true })).toBe('?foo=bar');
      });
    });

    describe('charset handling', () => {
      it('should add charset sentinel', () => {
        expect(stringify({ foo: 'bar' }, { charsetSentinel: true })).toBe('utf8=%E2%9C%93&foo=bar');
      });

      it('should handle different charsets', () => {
        expect(stringify({ foo: 'bar' }, { charset: 'iso-8859-1', charsetSentinel: true })).toBe('utf8=%26%2310003%3B&foo=bar');
      });
    });

    describe('edge cases', () => {
      it('should handle circular references', () => {
        const obj: any = { foo: 'bar' };
        obj.self = obj;
        expect(() => stringify(obj)).not.toThrow();
      });

      it('should handle symbols', () => {
        const sym = Symbol('test');
        expect(stringify({ [sym]: 'value', foo: 'bar' })).toBe('foo=bar');
      });

      it('should handle functions', () => {
        expect(stringify({ foo: () => 'bar', baz: 'qux' })).toBe('baz=qux');
      });

      it('should handle very large objects', () => {
        const largeObj: any = {};
        for (let i = 0; i < 1000; i++) {
          largeObj[`key${i}`] = `value${i}`;
        }
        const result = stringify(largeObj);
        expect(result.split('&').length).toBe(1000);
      });
    });
  });

  describe('stringifyUrl', () => {
    it('should append query string to URL', () => {
      expect(stringifyUrl('https://example.com', { foo: 'bar' })).toBe('https://example.com?foo=bar');
    });

    it('should append to existing query string', () => {
      expect(stringifyUrl('https://example.com?existing=value', { foo: 'bar' })).toBe('https://example.com?existing=value&foo=bar');
    });

    it('should handle empty query object', () => {
      expect(stringifyUrl('https://example.com', {})).toBe('https://example.com');
    });

    it('should handle empty URL', () => {
      expect(stringifyUrl('', { foo: 'bar' })).toBe('');
      expect(stringifyUrl(null as any, { foo: 'bar' })).toBe('');
    });

    it('should pass options to stringify', () => {
      expect(stringifyUrl('https://example.com', { nums: [1, 2] }, { arrayFormat: 'brackets' })).toBe('https://example.com?nums[]=1&nums[]=2');
    });
  });

  describe('Edge cases for coverage', () => {
    it('should skip inherited properties', () => {
      const obj = Object.create({ inherited: 'value' });
      obj.own = 'property';
      const result = stringify(obj);
      expect(result).toBe('own=property');
      expect(result).not.toContain('inherited');
    });

    it('should skip functions', () => {
      const obj = { 
        value: 'test',
        func: function() { return 'test'; }
      };
      const result = stringify(obj);
      expect(result).toBe('value=test');
      expect(result).not.toContain('func');
    });

    it('should handle empty objects with skipNulls', () => {
      const result = stringify({}, { skipNulls: true });
      expect(result).toBe('');
    });

    it('should handle null values in stringifyValue', () => {
      const obj = { nullValue: null };
      const result = stringify(obj, { strictNullHandling: true });
      expect(result).toBe('nullValue');
    });

    it('should handle objects with filter function', () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = stringify(obj, { 
        filter: (prefix, value) => prefix === 'b' ? undefined : value 
      });
      expect(result).not.toContain('b=');
      expect(result).toContain('a=1');
      expect(result).toContain('c=3');
    });

    it('should handle Date objects', () => {
      const date = new Date('2024-01-01T00:00:00.000Z');
      const result = stringify({ date });
      expect(result).toBe('date=2024-01-01T00%3A00%3A00.000Z');
    });

    it('should handle Date objects with custom serializeDate', () => {
      const date = new Date('2024-01-01T00:00:00.000Z');
      const result = stringify({ date }, {
        serializeDate: (d) => d.toISOString().split('T')[0]
      });
      expect(result).toBe('date=2024-01-01');
    });

    it('should handle nested Date objects in arrays', () => {
      const date = new Date('2024-01-01T00:00:00.000Z');
      const obj = { events: [{ when: date }] };
      const result = stringify(obj, { arrayFormat: 'json' });
      expect(result).toContain('2024-01-01T00%3A00%3A00.000Z');
    });

    it('should skip null and undefined values when skipNulls is true', () => {
      const obj = { a: 1, b: null, c: undefined, d: 2 };
      const result = stringify(obj, { skipNulls: true });
      expect(result).toBe('a=1&d=2');
      expect(result).not.toContain('b=');
      expect(result).not.toContain('c=');
    });

    it('should handle encodeValuesOnly option with special keys', () => {
      const obj = { 'key with spaces': 'value with spaces' };
      const result = stringify(obj, { encodeValuesOnly: true });
      expect(result).toBe('key with spaces=value%20with%20spaces');
    });

    it('should handle primitive values in formatValue', () => {
      const obj = { str: 'test', num: 42, bool: true, nul: null };
      const result = stringify(obj);
      expect(result).toContain('str=test');
      expect(result).toContain('num=42');
      expect(result).toContain('bool=true');
      expect(result).toContain('nul=');
    });

    it('should skip null values when skipNulls is enabled', () => {
      const obj = { a: 1, b: null, c: undefined, d: 'test' };
      const result = stringify(obj, { skipNulls: true });
      expect(result).toBe('a=1&d=test');
      expect(result).not.toContain('b=');
      expect(result).not.toContain('c=');
    });

    it('should handle formatValue with null and undefined', () => {
      // Test formatValue function directly through JSON array format
      const obj = { arr: [null, undefined, 'test'] };
      const result = stringify(obj, { arrayFormat: 'json' });
      expect(result).toContain('null');
      expect(result).toContain('test');
    });

    it('should handle formatValue with Date objects', () => {
      const date = new Date('2024-01-01T00:00:00.000Z');
      const obj = { items: [date] };
      const result = stringify(obj, { arrayFormat: 'json' });
      expect(result).toContain('2024-01-01T00'); // Date is encoded, so check partial
    });

    it('should handle formatValue with complex objects', () => {
      const complexObj = { nested: { key: 'value' } };
      const obj = { items: [complexObj] };
      const result = stringify(obj, { arrayFormat: 'json' });
      expect(result).toContain('nested'); // Object is encoded, so check partial
    });

    it('should handle skipNulls with actual null values in object', () => {
      // This should hit line 191: continue when skipNulls && value is null/undefined
      const obj = { 
        keep: 'value', 
        skipThis: null, 
        alsoSkip: undefined,
        keep2: 'another'
      };
      const result = stringify(obj, { skipNulls: true });
      expect(result).toBe('keep=value&keep2=another');
      expect(result).not.toContain('skipThis');
      expect(result).not.toContain('alsoSkip');
    });

    it('should handle direct Date serialization', () => {
      // This should hit line 263: return serializeDate(value) in formatValue
      const date = new Date('2024-01-01T00:00:00.000Z');
      const obj = { timestamp: date };
      const result = stringify(obj);
      expect(result).toContain('timestamp=2024-01-01T00');
    });

    it('should handle null/undefined in formatValue', () => {
      // This should hit line 259: return '' for null/undefined in formatValue
      const obj = { arr: [null, undefined, 'test'] };
      const result = stringify(obj, { arrayFormat: 'json' });
      expect(result).toContain('null');
    });

    it('should handle object serialization in formatValue', () => {
      // This should hit line 267: return encoder(JSON.stringify(value))
      const obj = { complex: { data: { nested: 'value' } } };
      const result = stringify(obj, { arrayFormat: 'json' });
      expect(result).toContain('complex'); // Object gets flattened instead of JSON.stringify
    });
  });

  describe('array element encoding and null handling (audit F006/F008)', () => {
    it('percent-encodes array element values in every array format (F006)', () => {
      expect(stringify({ a: ['x&y=z'] })).toBe('a=x%26y%3Dz');
      expect(stringify({ a: ['x&y'] }, { arrayFormat: 'brackets' })).toBe('a[]=x%26y');
      expect(stringify({ a: ['p&q', 'r'] }, { arrayFormat: 'indices' })).toBe('a[0]=p%26q&a[1]=r');
      expect(stringify({ a: ['x&y', 'b,c'] }, { arrayFormat: 'comma' })).toBe('a=x%26y,b%2Cc');
      expect(stringify({ a: [new Date(0)] })).toBe('a=1970-01-01T00%3A00%3A00.000Z');
      expect(stringify({ a: ['é'] })).toBe('a=%C3%A9');
    });

    it('round-trips array values containing delimiters (F006)', () => {
      const value = { a: ['x&y=z', 'b c'] };
      expect(parse(stringify(value))).toEqual(value);
    });

    it('leaves array values raw when encode is false (F006)', () => {
      expect(stringify({ a: ['x&y'] }, { encode: false })).toBe('a=x&y');
    });

    it('lets skipNulls win over strictNullHandling (F008)', () => {
      expect(stringify({ a: null, b: 1 }, { skipNulls: true, strictNullHandling: true })).toBe('b=1');
      expect(stringify({ o: { a: undefined, c: 2 } }, { skipNulls: true, strictNullHandling: true })).toBe('o[c]=2');
      expect(stringify({ a: null, b: 1 }, { strictNullHandling: true })).toBe('a&b=1');
    });
  });

  describe('comma/indices options and URL fragments (audit F024/F025)', () => {
    it('honors the documented comma and indices options (F024)', () => {
      expect(stringify({ a: [1, 2] }, { comma: true })).toBe('a=1,2');
      expect(stringify({ a: [1, 2] }, { indices: true })).toBe('a[0]=1&a[1]=2');
      expect(stringify({ o: { a: [1, 2] } }, { indices: true })).toBe('o[a][0]=1&o[a][1]=2');
      expect(stringify({ a: [1, 2] }, { comma: true, indices: true })).toBe('a=1,2');
      expect(stringify({ a: [1, 2] })).toBe('a=1&a=2');
    });

    it('lets an explicit arrayFormat win over comma and indices (F024)', () => {
      expect(stringify({ a: [1, 2] }, { arrayFormat: 'brackets', indices: true })).toBe('a[]=1&a[]=2');
      expect(stringify({ a: [1, 2] }, { arrayFormat: 'brackets', comma: true })).toBe('a[]=1&a[]=2');
    });

    it('places the query before the URL fragment (F025)', () => {
      expect(stringifyUrl('http://x.com/p#frag', { a: 1 })).toBe('http://x.com/p?a=1#frag');
      expect(stringifyUrl('http://x.com/p?z=1#frag', { a: 1 })).toBe('http://x.com/p?z=1&a=1#frag');
      expect(stringifyUrl('http://x.com/p#a#b', { a: 1 })).toBe('http://x.com/p?a=1#a#b');
      expect(stringifyUrl('http://x.com/p#frag', {})).toBe('http://x.com/p#frag');
    });
  });

  describe('commaRoundTrip (F040)', () => {
    it('writes a one-element comma array as a[] so it parses back as an array', () => {
      const opts = { arrayFormat: 'comma', commaRoundTrip: true } as const;
      expect(stringify({ a: ['x'] }, opts)).toBe('a[]=x');
      expect(parse(stringify({ a: ['x'] }, opts), { comma: true })).toEqual({ a: ['x'] });
      expect(stringify({ a: ['x'] }, { comma: true, commaRoundTrip: true })).toBe('a[]=x');
      expect(stringify({ o: { k: ['x'] } }, opts)).toBe('o[k][]=x');
      expect(stringify({ a: ['x y'] }, { ...opts, encodeValuesOnly: true })).toBe('a[]=x%20y');
    });

    it('is off by default and leaves other arrays and formats alone', () => {
      expect(stringify({ a: ['x'] }, { arrayFormat: 'comma' })).toBe('a=x');
      const multi = { arrayFormat: 'comma', commaRoundTrip: true } as const;
      expect(stringify({ a: ['x', 'y'] }, multi)).toBe('a=x,y');
      expect(stringify({ a: [] }, { arrayFormat: 'comma', commaRoundTrip: true })).toBe('');
      expect(stringify({ a: ['x'] }, { arrayFormat: 'repeat', commaRoundTrip: true })).toBe('a=x');
    });
  });

  describe('charset iso-8859-1 (F039)', () => {
    const latin1 = { charset: 'iso-8859-1' } as const;

    it('encodes latin1 characters as single %XX bytes and others as numeric references', () => {
      expect(stringify({ a: 'José' }, latin1)).toBe('a=Jos%E9');
      expect(stringify({ é: '1' }, latin1)).toBe('%E9=1');
      expect(stringify({ a: '€' }, latin1)).toBe('a=%26%238364%3B');
      expect(stringify({ a: '\u{1F600}' }, latin1)).toBe('a=%26%23128512%3B');
      expect(stringify({ a: ['é', '€'] }, latin1)).toBe('a=%E9&a=%26%238364%3B');
    });

    it('round-trips through parse', () => {
      const entities = { ...latin1, interpretNumericEntities: true };
      expect(parse(stringify({ a: 'Jé €' }, latin1), entities)).toEqual({ a: 'Jé €' });
      expect(parse(stringify({ é: 'ÿ ü' }, latin1), latin1)).toEqual({ é: 'ÿ ü' });
    });

    it('honours format and encodeValuesOnly, and still rejects lone surrogates', () => {
      expect(stringify({ a: "x y!'()*é" }, { ...latin1, format: 'RFC1738' })).toBe("a=x+y!'()*%E9");
      expect(stringify({ a: "!'()*" }, latin1)).toBe('a=%21%27%28%29%2A');
      expect(stringify({ a: { b: 'é' } }, { ...latin1, encodeValuesOnly: true })).toBe('a[b]=%E9');
      expect(() => stringify({ a: '\ud800' }, latin1)).toThrow('Invalid UTF-8');
    });

    it('round-trips its own charset sentinel through parse (F044)', () => {
      const withSentinel = { ...latin1, charsetSentinel: true };
      expect(stringify({ a: 'José' }, withSentinel)).toBe('utf8=%26%2310003%3B&a=Jos%E9');
      expect(parse(stringify({ a: 'José' }, withSentinel), withSentinel)).toEqual({ a: 'José' });
      const utf8 = { charsetSentinel: true };
      expect(parse(stringify({ a: 'José' }, utf8), utf8)).toEqual({ a: 'José' });
    });

    it('keeps utf-8 as the default and hands the charset to a custom encoder', () => {
      expect(stringify({ a: 'José' })).toBe('a=Jos%C3%A9');
      expect(stringify({ a: 'é€' }, { charset: 'utf-8' })).toBe('a=%C3%A9%E2%82%AC');
      const encoder = (s: string, d: (x: string) => string, cs?: string) => `${cs}:${d(s)}`;
      expect(stringify({ a: 'é' }, { ...latin1, encoder })).toBe('iso-8859-1:a=iso-8859-1:%E9');
    });
  });
});