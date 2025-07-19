import querystring, { parse, stringify, QueryBuilder, q, schema, PluginManager, timestampPlugin, lowercaseKeysPlugin } from '../../src';

describe('Integration Tests', () => {
  describe('End-to-end scenarios', () => {
    it('should handle complex nested structures', () => {
      const obj = {
        user: {
          name: 'John Doe',
          age: 30,
          preferences: {
            theme: 'dark',
            notifications: true
          }
        },
        tags: ['javascript', 'typescript', 'node'],
        metadata: {
          created: new Date('2024-01-01'),
          updated: null
        }
      };

      const stringified = stringify(obj, { 
        arrayFormat: 'brackets',
        serializeDate: (d) => d.toISOString().split('T')[0]
      });
      
      const parsed = parse(stringified, {
        arrayFormat: 'brackets',
        parseDates: true,
        parseBooleans: true,
        parseNumbers: true
      });

      expect(parsed.user).toEqual({
        name: 'John Doe',
        age: 30,
        preferences: {
          theme: 'dark',
          notifications: true
        }
      });
      expect(parsed.tags).toEqual(['javascript', 'typescript', 'node']);
      expect(parsed.metadata).toHaveProperty('created');
    });

    it('should handle QueryBuilder with schema validation', () => {
      const querySchema = schema({
        page: q.number().min(1).default(1),
        limit: q.number().max(100).default(10),
        sort: q.enum('asc', 'desc').default('asc'),
        filters: q.object().shape({
          category: q.string().optional(),
          minPrice: q.number().optional(),
          maxPrice: q.number().optional()
        }).optional()
      });

      const builder = new QueryBuilder()
        .add('page', 2)
        .add('limit', 20)
        .add('sort', 'desc')
        .addObject('filters', {
          category: 'electronics',
          minPrice: 100,
          maxPrice: 1000
        });

      const query = builder.toObject();
      const validated = querySchema.parse(query);

      expect(validated).toEqual({
        page: 2,
        limit: 20,
        sort: 'desc',
        filters: {
          category: 'electronics',
          minPrice: 100,
          maxPrice: 1000
        }
      });
    });

    it('should work with plugins', () => {
      const pluginManager = new PluginManager();
      pluginManager.register(timestampPlugin);
      pluginManager.register(lowercaseKeysPlugin);

      const obj = { FOO: 'bar', BAZ: 'qux' };
      
      const beforeStringify = pluginManager.applyBeforeStringify(obj, {});
      expect(beforeStringify).toHaveProperty('_timestamp');
      expect(beforeStringify).toHaveProperty('foo', 'bar');
      expect(beforeStringify).toHaveProperty('baz', 'qux');

      const stringified = stringify(beforeStringify);
      const parsed = parse(stringified);
      const afterParse = pluginManager.applyAfterParse(parsed, {});

      expect(afterParse).toHaveProperty('foo');
      expect(afterParse).toHaveProperty('baz');
      expect(afterParse).toHaveProperty('_timestamp');
    });

    it('should handle URL manipulation', () => {
      const baseUrl = 'https://api.example.com/products';
      const query = {
        category: 'electronics',
        minPrice: 100,
        maxPrice: 1000,
        tags: ['smartphone', 'android'],
        inStock: true
      };

      const url = querystring.stringifyUrl(baseUrl, query, {
        arrayFormat: 'comma'
        // parseBooleans: true // This option doesn't exist in StringifyOptions
      });

      expect(url).toContain('category=electronics');
      expect(url).toContain('minPrice=100');
      expect(url).toContain('tags=smartphone,android');
      expect(url).toContain('inStock=true');

      const parsed = querystring.parseUrl(url, {
        arrayFormat: 'comma',
        parseNumbers: true,
        parseBooleans: true
      });

      expect(parsed.url).toBe(baseUrl);
      expect(parsed.query).toEqual({
        category: 'electronics',
        minPrice: 100,
        maxPrice: 1000,
        tags: ['smartphone', 'android'],
        inStock: true
      });
    });

    it('should handle security features', () => {
      const secureParser = querystring.createSecureParser({
        maxKeys: 10,
        maxDepth: 3,
        sanitize: true
      });

      const safeQuery = 'name=John&age=30&city=NYC';
      const result = secureParser(safeQuery);
      expect(result).toEqual({
        name: 'John',
        age: '30',
        city: 'NYC'
      });

      // With sanitize: true, malicious content is cleaned and becomes safe
      const maliciousQuery = '__proto__[admin]=true&comment=<script>alert(1)</script>';
      const sanitizedResult = secureParser(maliciousQuery);
      expect(sanitizedResult).toEqual({ comment: 'alert(1)' });

      // With sanitize: false, should throw on malicious content
      const strictParser = querystring.createSecureParser({
        maxKeys: 10,
        maxDepth: 3,
        sanitize: false
      });
      expect(() => strictParser(maliciousQuery)).toThrow();
    });

    it('should handle all array formats correctly', () => {
      const arrayFormats = ['brackets', 'indices', 'repeat', 'comma', 'separator', 'json'] as const;
      const data = { items: ['a', 'b', 'c'] };

      for (const format of arrayFormats) {
        const stringified = stringify(data, { arrayFormat: format });
        const parsed = parse(stringified, { arrayFormat: format });
        expect(parsed).toEqual(data);
      }
    });

    it('should handle builder chaining and transformations', () => {
      const result = QueryBuilder
        .create()
        .add('search', 'typescript')
        .addArray('categories', ['tutorial', 'guide'])
        .when(true, (b) => b.add('advanced', true))
        .unless(false, (b) => b.add('beginner', false))
        .transform((query) => {
          return Object.fromEntries(
            Object.entries(query).map(([k, v]) => [k.toUpperCase(), v])
          );
        })
        .tap((b) => {
          expect(b.has('SEARCH')).toBe(true);
        })
        .build({ arrayFormat: 'brackets' });

      expect(result).toContain('SEARCH=typescript');
      expect(result).toContain('CATEGORIES[]=tutorial');
      expect(result).toContain('CATEGORIES[]=guide');
      expect(result).toContain('ADVANCED=true');
      expect(result).toContain('BEGINNER=false');
    });

    it('should handle edge cases gracefully', () => {
      const edgeCases = [
        { input: '', expected: {} },
        { input: '=', expected: { '': '' } },
        { input: '==', expected: { '': '=' } },
        { input: '&&', expected: {} },
        { input: 'a=1&&b=2', expected: { a: '1', b: '2' } },
        { input: 'emoji=😀', expected: { emoji: '😀' } },
        { input: 'unicode=你好', expected: { unicode: '你好' } }
      ];

      for (const { input, expected } of edgeCases) {
        const result = parse(input);
        expect(result).toEqual(expected);
      }
    });

    it('should maintain data integrity through round trips', () => {
      const testCases = [
        { str: 'hello world', num: 42, bool: true, nil: null },
        { arr: [1, 2, 3], nested: { a: 'b' } },
        { special: '!@#$%^&*()_+-=[]{}|;:,.<>?' },
        { unicode: '🎉 你好 мир' },
        { date: new Date('2024-01-01') }
      ];

      for (const testCase of testCases) {
        const stringified = stringify(testCase, { 
          serializeDate: (d) => d.toISOString(),
          strictNullHandling: true
        });
        const parsed = parse(stringified, { 
          parseDates: true,
          parseNumbers: true,
          parseBooleans: true,
          strictNullHandling: true
        });
        
        if (testCase.date) {
          expect(parsed.date).toBeInstanceOf(Date);
          expect(((parsed.date as unknown) as Date).toISOString()).toBe(testCase.date.toISOString());
        } else {
          expect(parsed).toEqual(testCase);
        }
      }
    });

    it('should work with default export', () => {
      expect(typeof querystring.parse).toBe('function');
      expect(typeof querystring.stringify).toBe('function');
      expect(querystring.QueryBuilder).toBe(QueryBuilder);
      expect(querystring.q).toBe(q);
      expect(querystring.schema).toBe(schema);
      expect(querystring.version).toBe('1.0.0');
    });
  });

  describe('Performance considerations', () => {
    it('should handle large objects efficiently', () => {
      const largeObject: any = {};
      for (let i = 0; i < 1000; i++) {
        largeObject[`key${i}`] = `value${i}`;
      }

      const start = Date.now();
      const stringified = stringify(largeObject);
      const stringifyTime = Date.now() - start;

      const parseStart = Date.now();
      const parsed = parse(stringified);
      const parseTime = Date.now() - parseStart;

      expect(Object.keys(parsed).length).toBe(1000);
      expect(stringifyTime).toBeLessThan(100); // Should complete within 100ms
      expect(parseTime).toBeLessThan(100); // Should complete within 100ms
    });

    it('should handle deeply nested objects', () => {
      let obj: any = { value: 'deep' };
      for (let i = 0; i < 10; i++) {
        obj = { nested: obj };
      }

      const stringified = stringify(obj);
      const parsed = parse(stringified, { depth: 15 });
      
      let current = parsed;
      for (let i = 0; i < 10; i++) {
        expect(current).toHaveProperty('nested');
        current = current.nested as any;
      }
      expect(current).toEqual({ value: 'deep' });
    });
  });
});