import querystring, { PluginManager, timestampPlugin, lowercaseKeysPlugin, parse, ParsedQuery } from '../../src';

describe('Main querystring export', () => {
  describe('parse with plugins', () => {
    it('should work without plugins', () => {
      const result = querystring.parse('foo=bar&baz=qux');
      expect(result).toEqual({ foo: 'bar', baz: 'qux' });
    });

    it('should work with plugins=true (default plugin manager)', () => {
      const result = querystring.parse('foo=bar&baz=qux', { plugins: true });
      expect(result).toEqual({ foo: 'bar', baz: 'qux' });
    });

    it('should work with custom plugin manager', () => {
      const pluginManager = new PluginManager();
      pluginManager.register(lowercaseKeysPlugin);

      const result = querystring.parse('FOO=bar&BAZ=qux', { plugins: pluginManager });
      expect(result).toEqual({ foo: 'bar', baz: 'qux' });
    });

    it('should apply parse hooks when available', () => {
      const pluginManager = new PluginManager();
      pluginManager.register(lowercaseKeysPlugin);

      const result = querystring.parse('FOO=bar&BAZ=qux', { plugins: pluginManager });
      expect(result).toEqual({ foo: 'bar', baz: 'qux' });
    });

    it('should work with plugins=false (null)', () => {
      const result = querystring.parse('foo=bar&baz=qux', { plugins: false });
      expect(result).toEqual({ foo: 'bar', baz: 'qux' });
    });
  });

  describe('stringify with plugins', () => {
    it('should work without plugins', () => {
      const result = querystring.stringify({ foo: 'bar', baz: 'qux' });
      expect(result).toBe('foo=bar&baz=qux');
    });

    it('should work with plugins=true (default plugin manager)', () => {
      const result = querystring.stringify({ foo: 'bar', baz: 'qux' }, { plugins: true });
      expect(result).toBe('foo=bar&baz=qux');
    });

    it('should work with custom plugin manager', () => {
      const pluginManager = new PluginManager();
      pluginManager.register(lowercaseKeysPlugin);

      const result = querystring.stringify({ FOO: 'bar', BAZ: 'qux' }, { plugins: pluginManager });
      expect(result).toContain('foo=bar');
      expect(result).toContain('baz=qux');
    });

    it('should apply before and after stringify hooks', () => {
      const pluginManager = new PluginManager();
      pluginManager.register(timestampPlugin);

      const result = querystring.stringify({ foo: 'bar' }, { plugins: pluginManager });
      expect(result).toContain('foo=bar');
      expect(result).toContain('_timestamp=');
    });

    it('should work with plugins=false (null)', () => {
      const result = querystring.stringify({ foo: 'bar', baz: 'qux' }, { plugins: false });
      expect(result).toBe('foo=bar&baz=qux');
    });
  });

  describe('other exports', () => {
    it('should export parseUrl', () => {
      expect(typeof querystring.parseUrl).toBe('function');
      const result = querystring.parseUrl('https://example.com?foo=bar');
      expect(result.url).toBe('https://example.com');
      expect(result.query).toEqual({ foo: 'bar' });
    });

    it('should export stringifyUrl', () => {
      expect(typeof querystring.stringifyUrl).toBe('function');
      const result = querystring.stringifyUrl('https://example.com', { foo: 'bar' });
      expect(result).toBe('https://example.com?foo=bar');
    });

    it('should export QueryBuilder', () => {
      expect(querystring.QueryBuilder).toBeDefined();
      const builder = new querystring.QueryBuilder();
      expect(builder).toBeDefined();
    });

    it('should export builder factory', () => {
      expect(typeof querystring.builder).toBe('function');
      const builder = querystring.builder();
      expect(builder).toBeDefined();
    });

    it('should export q', () => {
      expect(querystring.q).toBeDefined();
      expect(typeof querystring.q.string).toBe('function');
    });

    it('should export schema', () => {
      expect(typeof querystring.schema).toBe('function');
    });

    it('should export validate', () => {
      expect(typeof querystring.validate).toBe('function');
    });

    it('should export createSecureParser', () => {
      expect(typeof querystring.createSecureParser).toBe('function');
    });

    it('should export plugins (default plugin manager)', () => {
      expect(querystring.plugins).toBeDefined();
    });

    it('should export isValid', () => {
      expect(typeof querystring.isValid).toBe('function');
    });

    it('should export version', () => {
      expect(querystring.version).toBe('1.0.0');
    });
  });

  describe('non-string input with plugins (audit F018)', () => {
    it('keeps parse() graceful and skips beforeParse hooks for non-string input', () => {
      let calls = 0;
      const manager = PluginManager.create([
        {
          name: 'upper',
          beforeParse: (input: string) => {
            calls++;
            return input.toUpperCase();
          },
        },
      ]);

      expect(querystring.parse('a=1', { plugins: manager })).toEqual({ A: '1' });
      calls = 0;
      for (const bad of [undefined, null, 42]) {
        expect(querystring.parse(bad as unknown as string, { plugins: manager })).toEqual({});
      }
      expect(calls).toBe(0);
    });

    it('keeps stringify() graceful for non-object input and skips beforeStringify hooks (F036)', () => {
      const manager = PluginManager.create([lowercaseKeysPlugin, timestampPlugin]);

      for (const bad of [null, undefined, 42, 'text', true]) {
        expect(querystring.stringify(bad as unknown, { plugins: manager })).toBe('');
      }
      expect(querystring.stringify({ A: 1 }, { plugins: PluginManager.create([lowercaseKeysPlugin]) })).toBe('a=1');
    });
  });

  // [F043] The documented `querystring.parse<SearchParams>(...)` must type-check (ts-jest fails this file otherwise).
  describe('typed parse', () => {
    interface SearchParams {
      q: string;
      page: number;
    }

    it('accepts a type argument on both parse entry points', () => {
      const params = querystring.parse<SearchParams>('q=x&page=2', { parseNumbers: true });
      const page: number = params.page;
      const q: string = params.q;
      expect({ q, page }).toEqual({ q: 'x', page: 2 });
      const named = parse<SearchParams>('q=y');
      expect(named.q).toBe('y');
      const plugins = PluginManager.create([lowercaseKeysPlugin]);
      const withPlugins = querystring.parse<SearchParams>('Q=z', { plugins });
      expect(withPlugins.q).toBe('z');
    });

    it('keeps ParsedQuery as the default result type', () => {
      const result: ParsedQuery = querystring.parse('a=1');
      const named: ParsedQuery = parse('a=1');
      expect(result).toEqual(named);
    });
  });
});