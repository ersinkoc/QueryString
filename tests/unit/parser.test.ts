import { parse, parseUrl } from '../../src/parser';
import { stringify } from '../../src/stringifier';

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

      it('decodes each %XX as one latin1 character for iso-8859-1 (F038)', () => {
        const latin1 = { charset: 'iso-8859-1' } as const;
        expect(parse('a=Jos%E9', latin1)).toEqual({ a: 'José' });
        expect(parse('%E9=1', latin1)).toEqual({ é: '1' });
        expect(parse('a=x+%e9', latin1)).toEqual({ a: 'x é' });
        expect(parse('a=%C3%A9', latin1)).toEqual({ a: 'Ã©' });
        expect(parse('a=%E9&a=%E8', latin1)).toEqual({ a: ['é', 'è'] });
        expect(parse('a=100%25&b=%zz', latin1)).toEqual({ a: '100%', b: '%zz' });
        expect(parse('a%5Bb%5D=%E9', latin1)).toEqual({ a: { b: 'é' } });
      });

      it('keeps utf-8 decoding by default and lets a custom decoder win (F038)', () => {
        expect(parse('a=Jos%E9')).toEqual({ a: 'Jos%E9' });
        expect(parse('a=Jos%C3%A9', { charset: 'utf-8' })).toEqual({ a: 'José' });
        const decoder = (s: string) => `X${s}`;
        expect(parse('a=%E9', { charset: 'iso-8859-1', decoder })).toEqual({ Xa: 'X%E9' });
        expect(parse('a=%E9', { charset: 'iso-8859-1', decode: false })).toEqual({ a: '%E9' });
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
      // [F041] comma: true splits comma-separated values into arrays (the default keeps the string).
      expect(parse('tags=a,b,c', { comma: true })).toEqual({ tags: ['a', 'b', 'c'] });
      expect(parse('tags=a,b,c')).toEqual({ tags: 'a,b,c' });
    });

    it('lets an explicit arrayFormat win over comma and keeps scalars scalar (F041)', () => {
      expect(parse('a=x,y', { comma: true, arrayFormat: 'repeat' })).toEqual({ a: 'x,y' });
      expect(parse('a=x', { comma: true })).toEqual({ a: 'x' });
      expect(parse('o[k]=1,2&a=1,2&a=3', { comma: true })).toEqual({ o: { k: ['1', '2'] }, a: ['1', '2', '3'] });
      expect(parse('a=x,y', { comma: true, parseArrays: false })).toEqual({ a: 'x,y' });
    });

    it('splits comma / separator arrays on the raw value, then decodes and coerces each element (F046)', () => {
      const comma = { arrayFormat: 'comma' } as const;
      const sep = { arrayFormat: 'separator', arrayFormatSeparator: '|' } as const;
      expect(parse('a=x%2Cy', comma)).toEqual({ a: 'x,y' });
      expect(parse('a=a%2Cb,c', comma)).toEqual({ a: ['a,b', 'c'] });
      expect(parse('a=a%7Cb|c', sep)).toEqual({ a: ['a|b', 'c'] });
      expect(parse('a=%20x,y%20', comma)).toEqual({ a: [' x', 'y '] });
      expect(parse('a=x , y', comma)).toEqual({ a: ['x', 'y'] });
      expect(parse('a=1,2,true', { ...comma, parseNumbers: true, parseBooleans: true })).toEqual({ a: [1, 2, true] });
      expect(parse('a=x%2Cy,z', { ...comma, decode: false })).toEqual({ a: ['x%2Cy', 'z'] });
      expect(parse('a=x,y', { ...comma, decoder: (s: string) => s.toUpperCase() })).toEqual({ A: ['X', 'Y'] });
      expect(parse('a=,', comma)).toEqual({ a: ['', ''] });
    });

    it('parses a one-element bracket-separator array back as an array (F046)', () => {
      const bsep = { arrayFormat: 'bracket-separator', arrayFormatSeparator: '|' } as const;
      expect(parse('a[]=x', bsep)).toEqual({ a: ['x'] });
      expect(parse('a[]=x|y', bsep)).toEqual({ a: ['x', 'y'] });
    });

    it('parses a[] as an array under the comma format so commaRoundTrip round-trips (F040)', () => {
      expect(parse('a[]=x', { arrayFormat: 'comma' })).toEqual({ a: ['x'] });
      expect(parse('a[]=x,y', { arrayFormat: 'comma' })).toEqual({ a: ['x', 'y'] });
      expect(parse('o[k][]=x', { arrayFormat: 'comma' })).toEqual({ o: { k: ['x'] } });
      expect(parse('a=x', { arrayFormat: 'comma' })).toEqual({ a: 'x' });
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

  describe('conflicting and sparse keys (audit F001/F003)', () => {
    it('does not throw when a nested key descends through a scalar (F001)', () => {
      expect(parse('a=1&a[b]=2')).toEqual({ a: ['1', { b: '2' }] });
      expect(parse('a[b]=1&a[b][c]=2')).toEqual({ a: { b: ['1', { c: '2' }] } });
      expect(parse('a&a[b]=1', { strictNullHandling: true })).toEqual({ a: [null, { b: '1' }] });
    });

    it('resolves scalar/nested conflicts with the duplicates policy (F001)', () => {
      expect(parse('a=1&a[b]=2', { duplicates: 'last' })).toEqual({ a: { b: '2' } });
      expect(parse('a=1&a[b]=2', { duplicates: 'first' })).toEqual({ a: '1' });
      expect(parse('a=1&a[0]=2')).toEqual({ a: ['1', ['2']] });
    });

    it('does not throw for comma with strictNullHandling on a bare key (F002)', () => {
      expect(parse('a&b=1,2', { comma: true, strictNullHandling: true })).toEqual({ a: null, b: ['1', '2'] });
    });

    it('produces dense arrays by default so a[50000000]=x cannot allocate a huge array (F003)', () => {
      const result = parse('a[50000000]=x&b[3]=y&b[1]=z') as { a: string[]; b: string[] };
      expect(result.a).toEqual(['x']);
      expect(result.a.length).toBe(1);
      expect(result.b).toEqual(['z', 'y']);
      expect(parse('o[a][9]=z')).toEqual({ o: { a: ['z'] } });
    });

    it('keeps holes when allowSparse is true (F003)', () => {
      const result = parse('a[5]=x', { allowSparse: true }) as { a: string[] };
      expect(result.a.length).toBe(6);
      expect(0 in result.a).toBe(false);
    });
  });

  describe('single-element arrays, named keys on arrays, charset sentinel (audit F021/F022/F023)', () => {
    const brackets = { arrayFormat: 'brackets' } as const;
    const indices = { arrayFormat: 'indices' } as const;

    it('keeps one-element arrays as arrays for brackets and indices formats (F021)', () => {
      expect(parse('a[]=1', brackets)).toEqual({ a: ['1'] });
      expect(parse('a[0]=1', indices)).toEqual({ a: ['1'] });
      expect(parse('o[a][]=1', brackets)).toEqual({ o: { a: ['1'] } });
      expect(parse('a[]=', brackets)).toEqual({ a: [''] });
      expect(parse('a=0&a[]=1', brackets)).toEqual({ a: ['0', '1'] });
      // the default 'repeat' format does not interpret the bracket syntax
      expect(parse('a[]=1')).toEqual({ a: '1' });
    });

    it('round-trips one-element arrays through stringify (F021)', () => {
      const value = { a: ['1'], b: ['x', 'y'], c: 'scalar' };
      expect(parse(stringify(value, brackets), brackets)).toEqual(value);
      expect(parse(stringify(value, indices), indices)).toEqual(value);
    });

    it('does not lose named keys written under an array (F022)', () => {
      expect(parse('a=1&a=2&a[b]=3')).toEqual({ a: ['1', '2', { b: '3' }] });
      expect(parse('a=1&a=2&a[b]=3&a[c]=4')).toEqual({ a: ['1', '2', { b: '3', c: '4' }] });
      expect(parse('a[0]=x&a[b]=y')).toEqual({ a: ['x', { b: 'y' }] });
      expect(parse('a[b]=1&a=2&a[c]=3')).toEqual({ a: [{ b: '1' }, '2', { c: '3' }] });
      expect(parse('a[0][b]=1&a[1][b]=2')).toEqual({ a: [{ b: '1' }, { b: '2' }] });
    });

    it('treats + as a space even when a value or key has a malformed escape (F045)', () => {
      expect(parse('q=hello+world%')).toEqual({ q: 'hello world%' });
      expect(parse('a+b%zz=1')).toEqual({ 'a b%zz': '1' });
      expect(parse('a=x+y%zz', { decode: false })).toEqual({ a: 'x+y%zz' });
    });

    it('only consumes a pair that is exactly the charset sentinel (F023)', () => {
      const options = { charsetSentinel: true } as const;
      expect(parse('myutf8=%E2%9C%93&a=1', options)).toEqual({ myutf8: '✓', a: '1' });
      expect(parse('q=xutf8=%E2%9C%93&a=1', options)).toEqual({ q: 'xutf8=✓', a: '1' });
      expect(parse('a=1&utf8=%E2%9C%93&b=2', options)).toEqual({ a: '1', b: '2' });
      expect(parse('a=1;utf8=%E2%9C%93', { ...options, delimiter: ';' })).toEqual({ a: '1' });
    });

    it('consumes the iso-8859-1 sentinel and lets either sentinel select the charset (F044)', () => {
      const latin1 = { charset: 'iso-8859-1', charsetSentinel: true } as const;
      expect(parse('utf8=%26%2310003%3B&foo=bar', latin1)).toEqual({ foo: 'bar' });
      expect(parse('utf8=%26%2310003%3B', latin1)).toEqual({});
      const semi = { charsetSentinel: true, delimiter: ';' } as const;
      expect(parse('a=Jos%E9;utf8=%26%2310003%3B', semi)).toEqual({ a: 'José' });
      expect(parse('utf8=%E2%9C%93&a=Jos%C3%A9', { ...latin1 })).toEqual({ a: 'José' });
      const entities = { charsetSentinel: true, interpretNumericEntities: true } as const;
      expect(parse('utf8=%26%2310003%3B&a=%26%238364%3B', entities)).toEqual({ a: '€' });
      expect(parse('utf8=%26%2310003%3B&a=1')).toEqual({ utf8: '&#10003;', a: '1' });
      expect(parse('utf8=%26%2310004%3B&a=1', latin1)).toEqual({ utf8: '&#10004;', a: '1' });
      const both = parse('utf8=%E2%9C%93&utf8=%26%2310003%3B&a=%C3%A9', { charsetSentinel: true });
      expect(both).toEqual({ utf8: '&#10003;', a: 'é' });
    });
  });

  describe('parseUrl fragments (audit F026)', () => {
    it('ends the query at the fragment', () => {
      expect(parseUrl('http://x.com/p?a=1&b=2#frag')).toEqual({ url: 'http://x.com/p', query: { a: '1', b: '2' } });
      expect(parseUrl('http://x.com/p?#frag')).toEqual({ url: 'http://x.com/p', query: {} });
      expect(parseUrl('http://x.com/p?a=%23x#f')).toEqual({ url: 'http://x.com/p', query: { a: '#x' } });
    });

    it('does not treat a "?" inside the fragment as a query', () => {
      expect(parseUrl('http://x.com/p#frag?a=1')).toEqual({ url: 'http://x.com/p#frag?a=1', query: {} });
      expect(parseUrl('http://x.com/p?a=1#frag?x=2')).toEqual({ url: 'http://x.com/p', query: { a: '1' } });
    });
  });

  describe('undefined options mean "not set" (F056)', () => {
    const many = Array.from({ length: 1500 }, (_, i) => `k${i}=1`).join('&');

    it('keeps the default limits and decoding when an option is explicitly undefined', () => {
      expect(parse('a[b][c][d][e][f][g][h]=1', { depth: undefined })).toEqual({ a: { b: { c: { d: { e: {} } } } } });
      expect(() => parse(many, { parameterLimit: undefined })).toThrow('Parameter limit exceeded');
      expect(parse('a=%C3%A9', { decode: undefined })).toEqual({ a: 'é' });
      expect(parse('a=1&b=2', { delimiter: undefined })).toEqual({ a: '1', b: '2' });
      expect(parse('a=1&a=2', { duplicates: undefined })).toEqual({ a: ['1', '2'] });
      expect(parse('a=1', null as never)).toEqual({ a: '1' });
    });

    it('still honours explicit false / zero values and does not mutate the options', () => {
      expect(parse('a=%C3%A9', { decode: false })).toEqual({ a: '%C3%A9' });
      expect(parse('a[b]=1', { depth: 0 })).toEqual({});
      const options = { depth: undefined as number | undefined, allowDots: true };
      parse('a.b=1', options);
      expect(Object.keys(options)).toEqual(['depth', 'allowDots']);
    });
  });

  describe('allowDots keeps bracket notation; parseArrays:false makes indices plain keys (F062, F063)', () => {
    const dots = { allowDots: true } as const;
    const off = { parseArrays: false } as const;

    it('nests both a.b and a[b] (and mixtures) with allowDots (F062)', () => {
      expect(parse('a[b]=1', dots)).toEqual({ a: { b: '1' } });
      expect(parse('a[b][c]=1', dots)).toEqual({ a: { b: { c: '1' } } });
      expect(parse('a[b].c=1', dots)).toEqual({ a: { b: { c: '1' } } });
      expect(parse('a.b[c]=1', dots)).toEqual({ a: { b: { c: '1' } } });
      expect(parse('a[0]=1&a[1]=2', dots)).toEqual({ a: ['1', '2'] });
      expect(parse('a%5Bb%5D=1', dots)).toEqual({ a: { b: '1' } });
      expect(parse('a[b.c]=1', dots)).toEqual({ a: { 'b.c': '1' } });
      expect(parse('a[b=1', dots)).toEqual({ 'a[b': '1' });
      expect(parse('a..b=1', dots)).toEqual({ a: { '': { b: '1' } } });
      expect(parse('a.=1', dots)).toEqual({ a: { '': '1' } });
      expect(parse('a.b=1')).toEqual({ 'a.b': '1' });
    });

    it('treats bracket indices as object keys when parseArrays is false (F063)', () => {
      expect(parse('a[0]=1&a[1]=2', off)).toEqual({ a: { 0: '1', 1: '2' } });
      expect(parse('a[]=1&a[]=2', off)).toEqual({ a: { 0: '1', 1: '2' } });
      expect(parse('a[0][b]=1&a[1][b]=2', off)).toEqual({ a: { 0: { b: '1' }, 1: { b: '2' } } });
      expect(parse('a.0=x&a.1=y', { ...off, allowDots: true })).toEqual({ a: { 0: 'x', 1: 'y' } });
      expect(parse('a[]=1&b[]=2&a[]=3', off)).toEqual({ a: { 0: '1', 1: '3' }, b: { 0: '2' } });
      expect(parse('a=1&a=2', off)).toEqual({ a: ['1', '2'] });
      expect(parse('a[0]=1&a[1]=2')).toEqual({ a: ['1', '2'] });
    });
  });

  describe('allowPrototypes (F064)', () => {
    it('drops pairs whose keys would shadow Object.prototype methods', () => {
      const result = parse('hasOwnProperty=1&toString=2&valueOf=3&a=4') as Record<string, unknown>;
      expect(Object.keys(result)).toEqual(['a']);
      expect(typeof result.hasOwnProperty).toBe('function');
      expect(parse('a[hasOwnProperty][x]=1&a[toString]=2&a[ok]=3')).toEqual({ a: { ok: '3' } });
      expect(parse('a.valueOf.b=1&a.ok=2', { allowDots: true })).toEqual({ a: { ok: '2' } });
      expect(parse('myToString=1&hasOwnProperty2=2')).toEqual({ myToString: '1', hasOwnProperty2: '2' });
      expect(parse('a=1&toString=x&a=2')).toEqual({ a: ['1', '2'] });
    });

    it('keeps __proto__ / constructor / prototype inert for the security layer, and honours the opt-outs', () => {
      const inert = parse('__proto__=x&constructor=1&prototype=2&a=3') as Record<string, unknown>;
      expect(Object.keys(inert)).toEqual(['__proto__', 'constructor', 'prototype', 'a']);
      expect(Object.getPrototypeOf(inert)).toBe(Object.prototype);
      expect(Object.keys(parse('hasOwnProperty=1&toString=2', { allowPrototypes: true }))).toEqual(['hasOwnProperty', 'toString']);
      expect(Object.keys(parse('hasOwnProperty=1&toString=2', { plainObjects: true }))).toEqual(['hasOwnProperty', 'toString']);
      expect(() => parse('toString=1&valueOf=2&a=3', { parameterLimit: 2 })).toThrow('Parameter limit exceeded');
    });
  });

  describe('repeated keys are linear (F065)', () => {
    it('keeps concat semantics when appending duplicates in place', () => {
      expect(parse('a=1&a=2&a=3&a=4')).toEqual({ a: ['1', '2', '3', '4'] });
      expect(parse('a=1,2&a=3&a=4,5', { arrayFormat: 'comma' })).toEqual({ a: ['1', '2', '3', '4', '5'] });
      expect(parse('a[]=1&a=2', { arrayFormat: 'brackets' })).toEqual({ a: ['1', '2'] });
      expect(parse('a=1&a[]=2', { arrayFormat: 'brackets' })).toEqual({ a: ['1', '2'] });
      expect(parse('o[k]=1&o[k]=2&o[k]=3')).toEqual({ o: { k: ['1', '2', '3'] } });
      expect(parse('a=1&b=x&a=2&b=y')).toEqual({ a: ['1', '2'], b: ['x', 'y'] });
      const first = parse('a=1&a=2') as { a: string[] };
      first.a.push('x');
      expect(parse('a=1&a=2')).toEqual({ a: ['1', '2'] });
    });

    it('parses 40,000 repeated pairs quickly', () => {
      const query = Array.from({ length: 40000 }, (_, i) => `a=${i}`).join('&');
      const started = Date.now();
      const result = parse(query, { parameterLimit: Infinity }) as { a: string[] };
      expect(result.a).toHaveLength(40000);
      expect(Date.now() - started).toBeLessThan(800);
    });
  });

  describe('date-prefixed text (audit F072)', () => {
    it('keeps non-ISO text a string with parseDates', () => {
      expect(parse('d=2020-01-02%20Mar', { parseDates: true })).toEqual({ d: '2020-01-02 Mar' });
      expect(parse('d=2020-01-02%20(note)', { parseDates: true })).toEqual({ d: '2020-01-02 (note)' });
    });
  });
});
