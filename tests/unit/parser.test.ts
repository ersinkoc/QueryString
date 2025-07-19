import { parse, parseUrl } from '../../src/parser';

describe('Parser', () => {
  describe('parse', () => {
    describe('basic parsing', () => {
      it('should parse simple key-value pairs', () => {
        expect(parse('foo=bar')).toEqual({ foo: 'bar' });
        expect(parse('foo=bar&baz=qux')).toEqual({ foo: 'bar', baz: 'qux' });
      });

      it('should handle empty input', () => {
        expect(parse('')).toEqual({});
        expect(parse(null as any)).toEqual({});
        expect(parse(undefined as any)).toEqual({});
      });

      it('should handle missing values', () => {
        expect(parse('foo')).toEqual({ foo: '' });
        expect(parse('foo&bar')).toEqual({ foo: '', bar: '' });
      });

      it('should handle missing keys', () => {
        expect(parse('=value')).toEqual({ '': 'value' });
      });

      it('should decode values by default', () => {
        expect(parse('foo=hello%20world')).toEqual({ foo: 'hello world' });
        expect(parse('foo=hello+world')).toEqual({ foo: 'hello world' });
      });

      it('should handle URL encoding', () => {
        expect(parse('email=user%40example.com')).toEqual({ email: 'user@example.com' });
        expect(parse('url=https%3A%2F%2Fexample.com')).toEqual({ url: 'https://example.com' });
      });

      it('should handle special characters', () => {
        expect(parse('key=%3D%26%3F%23')).toEqual({ key: '=&?#' });
      });

      it('should ignore query prefix when specified', () => {
        expect(parse('?foo=bar', { ignoreQueryPrefix: true })).toEqual({ foo: 'bar' });
        expect(parse('foo=bar', { ignoreQueryPrefix: true })).toEqual({ foo: 'bar' });
      });
    });

    describe('delimiter options', () => {
      it('should use custom delimiter', () => {
        expect(parse('foo=bar;baz=qux', { delimiter: ';' })).toEqual({ foo: 'bar', baz: 'qux' });
        expect(parse('foo=bar|baz=qux', { delimiter: '|' })).toEqual({ foo: 'bar', baz: 'qux' });
      });
    });

    describe('decoding options', () => {
      it('should not decode when disabled', () => {
        expect(parse('foo=hello%20world', { decode: false })).toEqual({ foo: 'hello%20world' });
      });

      it('should use custom decoder', () => {
        const decoder = (str: string) => str.toUpperCase();
        expect(parse('foo=bar', { decoder })).toEqual({ FOO: 'BAR' });
      });
    });

    describe('null handling', () => {
      it('should handle null values with strictNullHandling', () => {
        expect(parse('foo', { strictNullHandling: true })).toEqual({ foo: null });
        expect(parse('foo=', { strictNullHandling: false })).toEqual({ foo: '' });
      });
    });

    describe('array parsing', () => {
      it('should parse arrays with repeat format', () => {
        expect(parse('foo=1&foo=2&foo=3', { arrayFormat: 'repeat' })).toEqual({ foo: ['1', '2', '3'] });
      });

      it('should parse arrays with brackets format', () => {
        expect(parse('foo[]=1&foo[]=2&foo[]=3', { arrayFormat: 'brackets' })).toEqual({ foo: ['1', '2', '3'] });
      });

      it('should parse arrays with indices format', () => {
        expect(parse('foo[0]=1&foo[1]=2&foo[2]=3', { arrayFormat: 'indices' })).toEqual({ foo: ['1', '2', '3'] });
      });

      it('should parse arrays with comma format', () => {
        expect(parse('foo=1,2,3', { arrayFormat: 'comma' })).toEqual({ foo: ['1', '2', '3'] });
      });

      it('should parse arrays with separator format', () => {
        expect(parse('foo=1|2|3', { arrayFormat: 'separator', arrayFormatSeparator: '|' })).toEqual({ foo: ['1', '2', '3'] });
      });

      it('should parse arrays with json format', () => {
        expect(parse('foo=["1","2","3"]', { arrayFormat: 'json' })).toEqual({ foo: ['1', '2', '3'] });
      });

      it('should handle malformed JSON arrays', () => {
        expect(parse('foo=[invalid', { arrayFormat: 'json' })).toEqual({ foo: '[invalid' });
      });
    });

    describe('type coercion', () => {
      it('should parse numbers when enabled', () => {
        expect(parse('int=42&float=3.14', { parseNumbers: true })).toEqual({ int: 42, float: 3.14 });
      });

      it('should not parse invalid numbers', () => {
        expect(parse('foo=42abc', { parseNumbers: true })).toEqual({ foo: '42abc' });
      });

      it('should parse booleans when enabled', () => {
        expect(parse('yes=true&no=false', { parseBooleans: true })).toEqual({ yes: true, no: false });
      });

      it('should parse dates when enabled', () => {
        const result = parse('date=2024-01-01', { parseDates: true });
        expect(result.date).toBeInstanceOf(Date);
        expect(((result.date as unknown) as Date).toISOString()).toBe('2024-01-01T00:00:00.000Z');
      });

      it('should handle typeCoercion object', () => {
        const result = parse('num=42&bool=true&date=2024-01-01', {
          typeCoercion: { numbers: true, booleans: true, dates: true }
        });
        expect(result).toEqual({
          num: 42,
          bool: true,
          date: new Date('2024-01-01')
        });
      });
    });

    describe('dot notation', () => {
      it('should parse dot notation when enabled', () => {
        expect(parse('user.name=John&user.age=30', { allowDots: true })).toEqual({
          user: { name: 'John', age: '30' }
        });
      });

      it('should not parse dot notation when disabled', () => {
        expect(parse('user.name=John', { allowDots: false })).toEqual({
          'user.name': 'John'
        });
      });

      it('should handle deep nesting with dots', () => {
        expect(parse('a.b.c.d=value', { allowDots: true })).toEqual({
          a: { b: { c: { d: 'value' } } }
        });
      });
    });

    describe('duplicate handling', () => {
      it('should combine duplicates by default', () => {
        expect(parse('foo=1&foo=2', { duplicates: 'combine' })).toEqual({ foo: ['1', '2'] });
      });

      it('should keep first duplicate', () => {
        expect(parse('foo=1&foo=2', { duplicates: 'first' })).toEqual({ foo: '1' });
      });

      it('should keep last duplicate', () => {
        expect(parse('foo=1&foo=2', { duplicates: 'last' })).toEqual({ foo: '2' });
      });
    });

    describe('security', () => {
      it('should respect parameter limit', () => {
        expect(() => parse('a=1&b=2&c=3', { parameterLimit: 2 })).toThrow('Parameter limit exceeded');
      });

      it('should respect depth limit', () => {
        const deepQuery = 'a[b][c][d][e][f]=value';
        expect(parse(deepQuery, { depth: 3, allowDots: false })).toEqual({
          a: { b: { c: {} } }
        });
      });
    });

    describe('charset handling', () => {
      it('should handle charset sentinel', () => {
        expect(parse('utf8=%E2%9C%93&foo=bar', { charsetSentinel: true })).toEqual({ foo: 'bar' });
      });

      it('should interpret numeric entities for iso-8859-1', () => {
        expect(parse('foo=%26%2365%3B%26%2366%3B%26%2367%3B', { 
          charset: 'iso-8859-1', 
          interpretNumericEntities: true 
        })).toEqual({ foo: 'ABC' });
      });
    });

    describe('edge cases', () => {
      it('should handle equals signs in values', () => {
        expect(parse('foo=bar=baz')).toEqual({ foo: 'bar=baz' });
      });

      it('should handle empty keys and values', () => {
        expect(parse('=&=')).toEqual({ '': ['', ''] });
      });

      it('should handle unicode characters', () => {
        expect(parse('emoji=😀&chinese=你好')).toEqual({ emoji: '😀', chinese: '你好' });
      });

      it('should handle very long strings', () => {
        const longValue = 'a'.repeat(10000);
        expect(parse(`key=${longValue}`)).toEqual({ key: longValue });
      });
    });
  });

  describe('parseUrl', () => {
    it('should parse URL and query string', () => {
      const result = parseUrl('https://example.com?foo=bar&baz=qux');
      expect(result).toEqual({
        url: 'https://example.com',
        query: { foo: 'bar', baz: 'qux' }
      });
    });

    it('should handle URLs without query string', () => {
      const result = parseUrl('https://example.com');
      expect(result).toEqual({
        url: 'https://example.com',
        query: {}
      });
    });

    it('should handle empty input', () => {
      expect(parseUrl('')).toEqual({ url: '', query: {} });
      expect(parseUrl(null as any)).toEqual({ url: '', query: {} });
    });

    it('should pass options to parser', () => {
      const result = parseUrl('https://example.com?nums=1&nums=2', { 
        arrayFormat: 'repeat',
        parseNumbers: true 
      });
      expect(result).toEqual({
        url: 'https://example.com',
        query: { nums: [1, 2] }
      });
    });
  });

  describe('Edge cases for coverage', () => {
    it('should handle comma option with comma-separated values', () => {
      const result = parse('tags=a,b,c', { comma: true });
      // comma option converts comma-separated values to arrays in stringifier
      // but this is about the parser - comma mostly affects parsing behavior
      expect(result).toEqual({ tags: 'a,b,c' });
    });

    it('should handle empty keys array in parseObject', () => {
      // This is a low-level edge case - empty keys should be handled gracefully
      const result = parse('');
      expect(result).toEqual({});
    });

    it('should create array when arrayIndex is detected', () => {
      const result = parse('items[0]=a&items[1]=b', { arrayFormat: 'indices' });
      expect(result).toEqual({ items: ['a', 'b'] });
    });

    it('should use plainObjects when specified', () => {
      const result = parse('obj[prop]=value', { plainObjects: true });
      expect(result).toHaveProperty('obj');
      expect(result.obj).toHaveProperty('prop', 'value');
    });

    it('should handle empty keys array in parseObject', () => {
      // This triggers the early return when keys.length === 0 (line 181)
      // Test with malformed input that could produce empty keys
      const result1 = parse('=value');
      expect(result1).toEqual({ '': 'value' });
      
      // Try with completely empty input
      const result2 = parse('');
      expect(result2).toEqual({});
      
      // Try with just delimiters
      const result3 = parse('&&&');
      expect(result3).toEqual({});
    });

    it('should create object when key doesnt exist', () => {
      // This triggers the target[key] = [] or {} paths (lines 198, 200)
      const result = parse('items[0]=test&obj[prop]=val');
      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('obj');
    });

    it('should create object when key doesnt exist and isArrayIndex is false', () => {
      // Test both plainObjects and regular object creation
      const result1 = parse('nested[deep][prop]=value', { plainObjects: false });
      expect(typeof result1.nested).toBe('object');
      expect((result1.nested as any).deep.prop).toBe('value');

      const result2 = parse('nested[deep][prop]=value', { plainObjects: true });
      expect(typeof result2.nested).toBe('object');
      expect((result2.nested as any).deep.prop).toBe('value');
    });
  });
});