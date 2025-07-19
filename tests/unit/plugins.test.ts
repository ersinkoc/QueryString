import {
  PluginManager,
  createPlugin,
  timestampPlugin,
  sortKeysPlugin,
  lowercaseKeysPlugin,
  filterEmptyPlugin,
  base64Plugin,
  compressPlugin,
  normalizePlugin,
  createCustomPlugin
} from '../../src/plugins';
import { ParseOptions, StringifyOptions } from '../../src/types';

describe('Plugin System', () => {
  describe('PluginManager', () => {
    let manager: PluginManager;

    beforeEach(() => {
      manager = new PluginManager();
    });

    it('should register plugins', () => {
      const plugin = createPlugin({
        name: 'test',
        beforeParse: (input) => input
      });

      manager.register(plugin);
      expect(manager.has('test')).toBe(true);
      expect(manager.get('test')).toBe(plugin);
    });

    it('should throw on duplicate plugin names', () => {
      const plugin = createPlugin({ name: 'test' });
      manager.register(plugin);
      expect(() => manager.register(plugin)).toThrow('Plugin "test" is already registered');
    });

    it('should throw on plugins without name', () => {
      const plugin = { beforeParse: (input: string) => input } as any;
      expect(() => manager.register(plugin)).toThrow('Plugin must have a name');
    });

    it('should unregister plugins', () => {
      const plugin = createPlugin({ name: 'test' });
      manager.register(plugin);
      expect(manager.unregister('test')).toBe(true);
      expect(manager.has('test')).toBe(false);
      expect(manager.unregister('test')).toBe(false);
    });

    it('should list registered plugins', () => {
      manager.register(createPlugin({ name: 'plugin1' }));
      manager.register(createPlugin({ name: 'plugin2' }));
      expect(manager.list()).toEqual(['plugin1', 'plugin2']);
    });

    it('should clear all plugins', () => {
      manager.register(createPlugin({ name: 'plugin1' }));
      manager.register(createPlugin({ name: 'plugin2' }));
      manager.clear();
      expect(manager.list()).toEqual([]);
    });

    it('should create manager with initial plugins', () => {
      const plugins = [
        createPlugin({ name: 'plugin1' }),
        createPlugin({ name: 'plugin2' })
      ];
      const newManager = PluginManager.create(plugins);
      expect(newManager.list()).toEqual(['plugin1', 'plugin2']);
    });

    describe('hook application', () => {
      const options: ParseOptions = {};
      const stringifyOptions: StringifyOptions = {};

      it('should apply beforeParse hooks', () => {
        manager.register(createPlugin({
          name: 'uppercase',
          beforeParse: (input) => input.toUpperCase()
        }));
        manager.register(createPlugin({
          name: 'prefix',
          beforeParse: (input) => 'PREFIX_' + input
        }));

        const result = manager.applyBeforeParse('test', options);
        expect(result).toBe('PREFIX_TEST');
      });

      it('should apply afterParse hooks', () => {
        manager.register(createPlugin({
          name: 'addField',
          afterParse: (result) => ({ ...result, added: true })
        }));

        const result = manager.applyAfterParse({ foo: 'bar' }, options);
        expect(result).toEqual({ foo: 'bar', added: true });
      });

      it('should apply beforeStringify hooks', () => {
        manager.register(createPlugin({
          name: 'addTimestamp',
          beforeStringify: (obj) => ({ ...obj, timestamp: 123 })
        }));

        const result = manager.applyBeforeStringify({ foo: 'bar' }, stringifyOptions);
        expect(result).toEqual({ foo: 'bar', timestamp: 123 });
      });

      it('should apply afterStringify hooks', () => {
        manager.register(createPlugin({
          name: 'uppercase',
          afterStringify: (result) => result.toUpperCase()
        }));

        const result = manager.applyAfterStringify('foo=bar', stringifyOptions);
        expect(result).toBe('FOO=BAR');
      });

      it('should skip plugins without specific hooks', () => {
        manager.register(createPlugin({
          name: 'partial',
          beforeParse: (input) => input + '_modified'
        }));

        expect(manager.applyAfterParse({ foo: 'bar' }, options)).toEqual({ foo: 'bar' });
        expect(manager.applyBeforeStringify({ foo: 'bar' }, stringifyOptions)).toEqual({ foo: 'bar' });
        expect(manager.applyAfterStringify('foo=bar', stringifyOptions)).toBe('foo=bar');
      });
    });
  });

  describe('Built-in Plugins', () => {
    describe('timestampPlugin', () => {
      it('should add timestamp to objects', () => {
        const result = timestampPlugin.beforeStringify!({ foo: 'bar' }, {} as any);
        expect(result).toHaveProperty('_timestamp');
        expect(typeof result._timestamp).toBe('number');
      });
    });

    describe('sortKeysPlugin', () => {
      it('should sort object keys alphabetically', () => {
        const input = { z: 1, a: 2, m: 3 };
        const result = sortKeysPlugin.beforeStringify!(input, {} as any);
        expect(Object.keys(result)).toEqual(['a', 'm', 'z']);
      });
    });

    describe('lowercaseKeysPlugin', () => {
      it('should lowercase keys after parsing', () => {
        const input = { FOO: 'bar', BaZ: 'qux' };
        const result = lowercaseKeysPlugin.afterParse!(input, {} as any);
        expect(result).toEqual({ foo: 'bar', baz: 'qux' });
      });

      it('should lowercase keys before stringifying', () => {
        const input = { FOO: 'bar', BaZ: 'qux' };
        const result = lowercaseKeysPlugin.beforeStringify!(input, {} as any);
        expect(result).toEqual({ foo: 'bar', baz: 'qux' });
      });
    });

    describe('filterEmptyPlugin', () => {
      it('should filter empty values', () => {
        const input = {
          foo: 'bar',
          empty: '',
          nil: null,
          undef: undefined,
          emptyArray: [],
          filledArray: [1, 2]
        };
        const result = filterEmptyPlugin.beforeStringify!(input, {} as any);
        expect(result).toEqual({
          foo: 'bar',
          filledArray: [1, 2]
        });
      });
    });

    describe('base64Plugin', () => {
      it('should encode stringified output to base64', () => {
        const input = 'foo=bar&baz=qux';
        const result = base64Plugin.afterStringify!(input, {} as any);
        expect(result).toBe(Buffer.from(input).toString('base64'));
      });

      it('should decode base64 input before parsing', () => {
        const original = 'foo=bar&baz=qux';
        const encoded = Buffer.from(original).toString('base64');
        const result = base64Plugin.beforeParse!(encoded, {} as any);
        expect(result).toBe(original);
      });

      it('should handle invalid base64', () => {
        const result = base64Plugin.beforeParse!('not-base64!@#', {} as any);
        expect(result).toBe('not-base64!@#');
      });

      it('should handle base64 decoding errors in catch block', () => {
        const originalGlobalThis = globalThis;
        
        // Mock globalThis to simulate error conditions
        (globalThis as any).atob = jest.fn().mockImplementation(() => {
          throw new Error('Base64 decode error');
        });
        (globalThis as any).Buffer = undefined;
        
        try {
          const result = base64Plugin.beforeParse!('invalid-base64', {} as any);
          expect(result).toBe('invalid-base64');
        } finally {
          Object.assign(globalThis, originalGlobalThis);
        }
      });

      it('should use Node.js Buffer when btoa/atob not available', () => {
        const originalGlobal = globalThis;
        
        // Mock Node.js environment without btoa/atob but with Buffer
        (globalThis as any).btoa = undefined;
        (globalThis as any).atob = undefined;
        (globalThis as any).Buffer = {
          from: jest.fn()
            .mockReturnValueOnce({ toString: () => 'dGVzdA==' }) // afterStringify
            .mockReturnValueOnce({ toString: () => 'test' }) // beforeParse decode
            .mockReturnValueOnce({ toString: () => 'dGVzdA==' }), // beforeParse reEncode
        };
        
        try {
          // Test afterStringify
          const encoded = base64Plugin.afterStringify!('test', {} as any);
          expect(encoded).toBe('dGVzdA==');
          
          // Test beforeParse with valid base64
          const decoded = base64Plugin.beforeParse!('dGVzdA==', {} as any);
          expect(decoded).toBe('test');
        } finally {
          Object.assign(globalThis, originalGlobal);
        }
      });

      it('should fallback to original when Buffer is not available', () => {
        const originalGlobal = globalThis;
        
        // Mock environment without any base64 support
        (globalThis as any).btoa = undefined;
        (globalThis as any).atob = undefined;
        (globalThis as any).Buffer = undefined;
        
        try {
          // Should return original when no encoding available
          const result1 = base64Plugin.afterStringify!('test', {} as any);
          expect(result1).toBe('test');
          
          // Should return original when no decoding available
          const result2 = base64Plugin.beforeParse!('dGVzdA==', {} as any);
          expect(result2).toBe('dGVzdA==');
        } finally {
          Object.assign(globalThis, originalGlobal);
        }
      });

      it('should handle invalid base64 in Node.js Buffer path', () => {
        const originalGlobal = globalThis;
        
        // Mock Node.js environment with invalid reencoding
        (globalThis as any).btoa = undefined;
        (globalThis as any).atob = undefined;
        (globalThis as any).Buffer = {
          from: jest.fn()
            .mockReturnValueOnce({ toString: () => 'test' }) // decode
            .mockReturnValueOnce({ toString: () => 'different' }), // reEncode doesn't match
        };
        
        try {
          const result = base64Plugin.beforeParse!('invalid', {} as any);
          expect(result).toBe('invalid'); // Should return original when reencoding doesn't match
        } finally {
          Object.assign(globalThis, originalGlobal);
        }
      });

      it('should handle invalid base64 in browser atob path', () => {
        const originalGlobal = globalThis;
        
        // Mock browser environment with invalid reencoding
        (globalThis as any).atob = jest.fn().mockReturnValue('test');
        (globalThis as any).btoa = jest.fn().mockReturnValue('different'); // doesn't match
        (globalThis as any).Buffer = undefined;
        
        try {
          const result = base64Plugin.beforeParse!('invalid', {} as any);
          expect(result).toBe('invalid'); // Should return original when reencoding doesn't match
        } finally {
          Object.assign(globalThis, originalGlobal);
        }
      });
    });

    describe('compressPlugin', () => {
      it('should decode common URL encodings', () => {
        const tests = [
          ['foo%20bar', 'foo bar'],
          ['foo%2520bar', 'foo bar'],
          ['foo+bar', 'foo bar'],
          ['path%2Fto%2Ffile', 'path/to/file'],
          ['key%3Avalue', 'key:value'],
          ['a%3Db', 'a=b'],
          ['foo%26bar', 'foo&bar'],
          ['query%3Ftest', 'query?test']
        ];

        for (const [input, expected] of tests) {
          const result = compressPlugin.afterStringify!(input, {} as any);
          expect(result).toBe(expected);
        }
      });
    });

    describe('normalizePlugin', () => {
      it('should normalize string values', () => {
        const input = {
          bool1: 'true',
          bool2: 'false',
          nil: 'null',
          undef: 'undefined',
          num: '42',
          float: '3.14',
          str: '  hello  ',
          invalid: '42abc'
        };
        const result = normalizePlugin.afterParse!(input, {} as any);
        expect(result).toEqual({
          bool1: true,
          bool2: false,
          nil: null,
          undef: undefined,
          num: 42,
          float: 3.14,
          str: 'hello',
          invalid: '42abc'
        });
      });

      it('should normalize nested objects', () => {
        const input = {
          nested: {
            bool: 'true',
            num: '42'
          }
        };
        const result = normalizePlugin.afterParse!(input, {} as any);
        expect(result).toEqual({
          nested: {
            bool: true,
            num: 42
          }
        });
      });

      it('should normalize arrays', () => {
        const input = {
          arr: ['true', '42', 'hello']
        };
        const result = normalizePlugin.afterParse!(input, {} as any);
        expect(result).toEqual({
          arr: [true, 42, 'hello']
        });
      });

      it('should handle non-string values', () => {
        const input = {
          num: 42,
          bool: true,
          nil: null,
          undef: undefined
        };
        const result = normalizePlugin.afterParse!(input, {} as any);
        expect(result).toEqual(input);
      });
    });
  });

  describe('createCustomPlugin', () => {
    it('should create custom plugin with all handlers', () => {
      const plugin = createCustomPlugin('custom', {
        beforeParse: (input) => input.toUpperCase(),
        afterParse: (result) => ({ ...result, parsed: true }),
        beforeStringify: (obj) => ({ ...obj, stringified: true }),
        afterStringify: (result) => result.toLowerCase()
      });

      expect(plugin.name).toBe('custom');
      expect(plugin.beforeParse!('test', {} as any)).toBe('TEST');
      expect(plugin.afterParse!({ foo: 'bar' }, {} as any)).toEqual({ foo: 'bar', parsed: true });
      expect(plugin.beforeStringify!({ foo: 'bar' }, {} as any)).toEqual({ foo: 'bar', stringified: true });
      expect(plugin.afterStringify!('FOO=BAR', {} as any)).toBe('foo=bar');
    });

    it('should create custom plugin with partial handlers', () => {
      const plugin = createCustomPlugin('partial', {
        beforeParse: (input) => input + '_modified'
      });

      expect(plugin.name).toBe('partial');
      expect(plugin.beforeParse).toBeDefined();
      expect(plugin.afterParse).toBeUndefined();
      expect(plugin.beforeStringify).toBeUndefined();
      expect(plugin.afterStringify).toBeUndefined();
    });
  });
});