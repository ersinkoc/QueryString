import {
  sanitizeInput,
  validateSecurity,
  countKeys,
  hasPrototypePollution,
  detectXSS,
  secureStringify,
  createSecureParser
} from '../../src/security';
import { parse } from '../../src/parser';

describe('Security', () => {
  describe('sanitizeInput', () => {
    it('should remove XSS patterns', () => {
      expect(sanitizeInput('<script>alert("xss")</script>')).toBe('alert(&quot;xss&quot;)');
      expect(sanitizeInput('<iframe src="evil"></iframe>')).toBe('');
      expect(sanitizeInput('javascript:alert(1)')).toBe('alert(1)');
      expect(sanitizeInput('<img onerror=alert(1)>')).toBe('&lt;img &gt;');
    });

    it('should escape HTML entities', () => {
      expect(sanitizeInput('<div>test</div>')).toBe('&lt;div&gt;test&lt;&#x2F;div&gt;');
      expect(sanitizeInput('"test"')).toBe('&quot;test&quot;');
      expect(sanitizeInput("'test'")).toBe('&#x27;test&#x27;');
      expect(sanitizeInput('test/path')).toBe('test&#x2F;path');
    });

    it('should handle embedded patterns', () => {
      expect(sanitizeInput('<embed src="evil">')).toBe('');
      expect(sanitizeInput('<object data="evil">')).toBe('');
      expect(sanitizeInput('<link href="evil">')).toBe('');
      expect(sanitizeInput('<style>body{background:url("evil")}</style>')).toBe('');
    });

    it('should handle vbscript and data URLs', () => {
      expect(sanitizeInput('vbscript:msgbox')).toBe('msgbox');
      expect(sanitizeInput('data:text/html,<script>alert(1)</script>')).toBe(',alert(1)');
    });

    it('should remove SQL injection patterns in aggressive mode', () => {
      expect(sanitizeInput('SELECT * FROM users', { aggressive: true })).toBe(' * FROM users');
      expect(sanitizeInput("'; DROP TABLE users; --", { aggressive: true })).toBe('  TABLE users ');
      expect(sanitizeInput('UNION SELECT password', { aggressive: true })).toBe('  password');
    });

    it('should handle non-string input', () => {
      expect(sanitizeInput(null as any)).toBe(null);
      expect(sanitizeInput(undefined as any)).toBe(undefined);
      expect(sanitizeInput(123 as any)).toBe(123);
    });
  });

  describe('validateSecurity', () => {
    it('should validate key count', () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = validateSecurity(obj, { maxKeys: 5 });
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should detect too many keys', () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = validateSecurity(obj, { maxKeys: 2 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Too many keys: 3 (max: 2)');
    });

    it('should validate object depth', () => {
      const obj = { a: { b: { c: 1 } } };
      const result = validateSecurity(obj, { maxDepth: 3 });
      expect(result.valid).toBe(true);
    });

    it('should detect excessive depth', () => {
      const obj = { a: { b: { c: { d: 1 } } } };
      const result = validateSecurity(obj, { maxDepth: 3 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Object too deep: 4 levels (max: 3)');
    });

    it('should detect prototype pollution', () => {
      const obj = { __proto__: { admin: true } };
      const result = validateSecurity(obj, { allowPrototypes: false });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Prototype pollution detected');
    });

    it('should allow prototype keys when specified', () => {
      const obj = { __proto__: { admin: true } };
      const result = validateSecurity(obj, { allowPrototypes: true });
      expect(result.valid).toBe(true);
    });

    it('should detect XSS in values', () => {
      const obj = { comment: '<script>alert("xss")</script>' };
      const result = validateSecurity(obj, { sanitize: true });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('XSS vulnerabilities detected');
    });

    it('should detect XSS in keys', () => {
      const obj = { '<script>key</script>': 'value' };
      const result = validateSecurity(obj, { sanitize: true });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('XSS vulnerabilities detected');
      expect(result.errors[0]).toContain('(key)');
    });
  });

  describe('countKeys', () => {
    it('should count flat object keys', () => {
      expect(countKeys({ a: 1, b: 2, c: 3 })).toBe(3);
    });

    it('should count nested object keys', () => {
      expect(countKeys({ a: { b: { c: 1 } } })).toBe(3);
    });

    it('should count array elements', () => {
      expect(countKeys({ arr: [1, 2, 3] })).toBe(1);
    });

    it('should count nested arrays', () => {
      expect(countKeys({ a: [{ b: 1 }, { c: 2 }] })).toBe(3);
    });

    it('should handle non-objects', () => {
      expect(countKeys('string')).toBe(0);
      expect(countKeys(123)).toBe(0);
      expect(countKeys(null)).toBe(0);
    });
  });

  describe('hasPrototypePollution', () => {
    it('should detect __proto__ key', () => {
      const obj: any = {};
      Object.defineProperty(obj, '__proto__', {
        value: {},
        enumerable: true,
        configurable: true,
        writable: true
      });
      expect(hasPrototypePollution(obj)).toBe(true);
    });

    it('should detect constructor key', () => {
      expect(hasPrototypePollution({ constructor: {} })).toBe(true);
    });

    it('should detect prototype key', () => {
      expect(hasPrototypePollution({ prototype: {} })).toBe(true);
    });

    it('should detect nested prototype pollution', () => {
      const nestedObj: any = {};
      Object.defineProperty(nestedObj, '__proto__', {
        value: {},
        enumerable: true,
        configurable: true,
        writable: true
      });
      expect(hasPrototypePollution({ nested: nestedObj })).toBe(true);
    });

    it('should detect in arrays', () => {
      const objInArray: any = {};
      Object.defineProperty(objInArray, '__proto__', {
        value: {},
        enumerable: true,
        configurable: true,
        writable: true
      });
      expect(hasPrototypePollution([objInArray])).toBe(true);
    });

    it('should return false for safe objects', () => {
      expect(hasPrototypePollution({ safe: 'value' })).toBe(false);
      expect(hasPrototypePollution({})).toBe(false);
    });

    it('should handle non-objects', () => {
      expect(hasPrototypePollution('string')).toBe(false);
      expect(hasPrototypePollution(123)).toBe(false);
      expect(hasPrototypePollution(null)).toBe(false);
    });

    it('should detect prototype pollution at object level', () => {
      const obj = {
        safe: 'value',
        __proto__: { polluted: true }
      };
      expect(hasPrototypePollution(obj)).toBe(true);
    });

    it('should recursively check nested objects for pollution', () => {
      const obj = {
        safe: 'value',
        nested: {
          constructor: { prototype: { polluted: true } }
        }
      };
      expect(hasPrototypePollution(obj)).toBe(true);
    });
  });

  describe('detectXSS', () => {
    it('should detect XSS in string values', () => {
      const obj = { comment: '<script>alert(1)</script>' };
      const vulnerabilities = detectXSS(obj);
      expect(vulnerabilities).toEqual(['comment']);
    });

    it('should detect XSS in nested objects', () => {
      const obj = { user: { bio: '<iframe src="evil"></iframe>' } };
      const vulnerabilities = detectXSS(obj);
      expect(vulnerabilities).toEqual(['user.bio']);
    });

    it('should detect XSS in arrays', () => {
      const obj = { comments: ['safe', '<script>evil</script>'] };
      const vulnerabilities = detectXSS(obj);
      expect(vulnerabilities).toEqual(['comments[1]']);
    });

    it('should detect XSS in keys', () => {
      const obj = { '<script>key</script>': 'value' };
      const vulnerabilities = detectXSS(obj);
      expect(vulnerabilities[0]).toContain('(key)');
    });

    it('should handle non-string values in XSS detection', () => {
      const obj = { 
        str: '<script>alert(1)</script>',
        num: 123,
        bool: true,
        nul: null,
        obj: { nested: 'value' }
      };
      const vulnerabilities = detectXSS(obj);
      expect(vulnerabilities).toEqual(['str']); // only string values are checked
    });

    it('should return false for non-string input in containsXSS', () => {
      // Test the typeof check in containsXSS function
      const vulnerabilities = detectXSS({ notString: 123 });
      expect(vulnerabilities).toEqual([]);
    });

    it('should detect multiple vulnerabilities', () => {
      const obj = {
        xss1: '<script>alert(1)</script>',
        nested: {
          xss2: 'javascript:alert(2)'
        }
      };
      const vulnerabilities = detectXSS(obj);
      expect(vulnerabilities).toContain('xss1');
      expect(vulnerabilities).toContain('nested.xss2');
    });

    it('should handle non-string values', () => {
      const obj = { num: 123, bool: true, nil: null };
      const vulnerabilities = detectXSS(obj);
      expect(vulnerabilities).toEqual([]);
    });

    it('should handle non-objects', () => {
      expect(detectXSS('string')).toEqual([]);
      expect(detectXSS(123)).toEqual([]);
      expect(detectXSS(null)).toEqual([]);
    });
  });

  describe('secureStringify', () => {
    it('should stringify safe objects', () => {
      const obj = { foo: 'bar', num: 42 };
      const result = secureStringify(obj);
      expect(JSON.parse(result)).toEqual(obj);
    });

    it('should throw on security violations', () => {
      const obj = { __proto__: { admin: true } };
      expect(() => secureStringify(obj)).toThrow('Security validation failed');
    });

    it('should sanitize when specified', () => {
      const obj = { comment: '<script>alert(1)</script>' };
      const result = secureStringify(obj, { sanitize: true });
      const parsed = JSON.parse(result);
      expect(parsed.comment).not.toContain('<script>');
    });

    it('should sanitize nested objects', () => {
      const obj = { user: { bio: '<iframe>evil</iframe>' } };
      const result = secureStringify(obj, { sanitize: true });
      const parsed = JSON.parse(result);
      expect(parsed.user.bio).toBe('');
    });

    it('should sanitize arrays', () => {
      const obj = { items: ['<script>evil</script>', 'safe'] };
      const result = secureStringify(obj, { sanitize: true });
      const parsed = JSON.parse(result);
      expect(parsed.items[0]).not.toContain('<script>');
      expect(parsed.items[1]).toBe('safe');
    });

    it('should handle non-string values during sanitization', () => {
      const obj = { str: 'text', num: 42, bool: true, nil: null };
      const result = secureStringify(obj, { sanitize: true });
      const parsed = JSON.parse(result);
      expect(parsed).toEqual({ str: 'text', num: '42', bool: 'true', nil: 'null' });
    });
  });

  describe('createSecureParser', () => {
    it('should create secure parser', () => {
      const secureParser = createSecureParser(parse);
      const result = secureParser('foo=bar&baz=qux');
      expect(result).toEqual({ foo: 'bar', baz: 'qux' });
    });

    it('should enforce security options', () => {
      const secureParser = createSecureParser(parse, { maxKeys: 1 });
      expect(() => secureParser('foo=bar&baz=qux')).toThrow('Too many keys');
    });

    it('should detect prototype pollution in parsed results', () => {
      const secureParser = createSecureParser(parse, { allowPrototypes: false });
      expect(() => secureParser('__proto__[admin]=true')).toThrow('Prototype pollution detected');
    });

    it('should sanitize parsed results when specified', () => {
      const secureParser = createSecureParser(parse, { sanitize: true });
      const result = secureParser('comment=<script>alert(1)</script>');
      expect(result.comment).not.toContain('<script>');
    });

    it('should combine multiple security checks', () => {
      const secureParser = createSecureParser(parse, {
        maxKeys: 10,
        maxDepth: 3,
        allowPrototypes: false,
        sanitize: true
      });
      
      const result = secureParser('safe=value&another=test');
      expect(result).toEqual({ safe: 'value', another: 'test' });
    });
  });

  describe('sanitizer evasion and __proto__ keys (audit F004/F005)', () => {
    it('removes patterns that re-form after a removal pass (F004)', () => {
      expect(sanitizeInput('javajavascript:script:alert(1)')).toBe('alert(1)');
      expect(sanitizeInput('vbvbscript:script:x')).toBe('x');
      expect(sanitizeInput('jajajavascript:vascript:vascript:x')).toBe('x');
      expect(sanitizeInput('un--ion', { aggressive: true })).toBe('');
      expect(detectXSS({ v: sanitizeInput('javajavascript:script:alert(1)') })).toEqual([]);
    });

    it('leaves benign input unchanged and is idempotent (F004)', () => {
      expect(sanitizeInput('hello world')).toBe('hello world');
      const once = sanitizeInput('<b>bold</b> & "quotes"');
      expect(sanitizeInput(once)).toBe(once);
    });

    it('accepts the documented options-only call and uses the built-in parse (F042)', () => {
      const docOptions = { maxKeys: 100, maxDepth: 5, allowPrototypes: false, sanitize: true };
      expect(createSecureParser(docOptions)('a=1&b=2')).toEqual({ a: '1', b: '2' });
      expect(createSecureParser()('a=1')).toEqual({ a: '1' });
      expect(createSecureParser({ sanitize: true })('a=%3Cb%3E')).toEqual({ a: '&lt;b&gt;' });
      expect(() => createSecureParser({ maxKeys: 1 })('a=1&b=2')).toThrow('Security validation failed');
      const deep = createSecureParser({ maxDepth: 1 });
      expect(() => deep('a[b][c][d]=1')).toThrow('Security validation failed');
      expect(createSecureParser({ maxKeys: 10 })('a=1', { parseNumbers: true })).toEqual({ a: 1 });
      expect(createSecureParser((s: string) => ({ q: s }))('x')).toEqual({ q: 'x' });
    });

    it('drops __proto__ keys instead of rewriting the prototype when sanitizing (F005)', () => {
      const payload = () => JSON.parse('{"__proto__":{"admin":true},"comment":"x"}');
      const result = createSecureParser(payload, { sanitize: true })('q');
      expect(result).toEqual({ comment: 'x' });
      expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
      expect((result as Record<string, unknown>).admin).toBeUndefined();
      expect(secureStringify(JSON.parse('{"__proto__":{"admin":true},"a":"1"}'), { sanitize: true })).toBe('{"a":"1"}');
    });

    it('still rejects __proto__ when sanitize is false (F005)', () => {
      const payload = () => JSON.parse('{"__proto__":{"admin":true},"comment":"x"}');
      expect(() => createSecureParser(payload, { sanitize: false })('q')).toThrow('Prototype pollution detected');
    });
  });

  describe('Dates and exotic objects (audit F031/F032)', () => {
    it('keeps Date values intact when sanitizing (F031)', () => {
      const parsed = createSecureParser(parse, { sanitize: true })('d=1970-01-01T00:00:00.000Z&o[d]=1970-01-01T00:00:00.000Z', {
        parseDates: true,
      }) as unknown as { d: Date; o: { d: Date } };
      expect(parsed.d).toBeInstanceOf(Date);
      expect(parsed.d.getTime()).toBe(0);
      expect(parsed.o.d).toBeInstanceOf(Date);
      expect(secureStringify({ d: new Date(0), l: [new Date(0)] }, { sanitize: true })).toBe(
        '{"d":"1970-01-01T00:00:00.000Z","l":["1970-01-01T00:00:00.000Z"]}'
      );
    });

    it('does not execute prototype accessors or reject Map/Set values (F032)', () => {
      let getterCalls = 0;
      class WithGetter {
        get computed(): string {
          getterCalls++;
          throw new Error('getter executed');
        }
      }

      expect(hasPrototypePollution({ m: new Map([[1, 2]]), s: new Set([1]) })).toBe(false);
      expect(hasPrototypePollution({ w: new WithGetter() })).toBe(false);
      expect(getterCalls).toBe(0);
      expect(validateSecurity({ m: new Map() } as never).valid).toBe(true);
      expect(secureStringify({ m: new Map() })).toBe('{"m":{}}');
    });

    it('still detects data properties planted on a prototype (F032)', () => {
      expect(hasPrototypePollution(Object.setPrototypeOf({ a: 1 }, { admin: true }))).toBe(true);
      expect(hasPrototypePollution({ deep: { inner: Object.create({ admin: true }) } })).toBe(true);
      expect(hasPrototypePollution({ l: [Object.setPrototypeOf({}, { admin: 'yes' })] })).toBe(true);
    });
  });

  describe('XSS detector precision (F054, F055)', () => {
    const flagged = (value: string) => detectXSS({ v: value }).length > 0;

    it('flags opening script / iframe / style tags without a closing tag or on several lines (F054)', () => {
      for (const value of ['<script>alert(1)', '<script>\nalert(1)\n</script>', '<SCRIPT SRC=//evil.example/x.js>', '<iframe src=//evil>', '<style>@import url(x)']) {
        expect(flagged(value)).toBe(true);
      }
      expect(validateSecurity({ q: '<script>alert(1)' }).valid).toBe(false);
      expect(detectXSS({ '<script>': 'x' })).toEqual(['<script> (key)']);
      expect(flagged('<scripture>')).toBe(false);
      expect(flagged('JavaScript is fun')).toBe(false);
    });

    it('does not treat ordinary words as event handlers or data: URIs (F055)', () => {
      for (const value of ['/search?options=a', 'Connection=keep-alive', 'metadata: a, b']) {
        expect(flagged(value)).toBe(false);
      }
      expect(validateSecurity({ next: '/p?actions=1&sort=asc' }).valid).toBe(true);
      expect(sanitizeInput('Connection=keep-alive')).toBe('Connection=keep-alive');
      expect(sanitizeInput('/search?actions=1&x=2')).toBe('&#x2F;search?actions=1&x=2');
      expect(sanitizeInput('I like options = yes')).toBe('I like options = yes');
      for (const value of ['<a onclick=x()>', '"onfocus=alert(1) x', ' ONCLICK=1', 'data:text/html,<b>']) {
        expect(flagged(value)).toBe(true);
      }
      expect(sanitizeInput('<img src=x onerror=alert(1)>')).toBe('&lt;img src=x &gt;');
    });
  });

  describe('runaway input (F066, F067)', () => {
    const deep = (levels: number): Record<string, unknown> => {
      let value: Record<string, unknown> = { v: 'x' };
      for (let i = 0; i < levels; i++) {
        value = { a: value };
      }
      return value;
    };
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    it('reports very deep or circular values instead of overflowing the stack (F066)', () => {
      for (const value of [deep(20000), deep(200000), circular]) {
        const result = validateSecurity(value as never, { maxDepth: 10 });
        expect(result.valid).toBe(false);
        expect(result.errors).toEqual(['Object too deep: over 1000 levels (max: 10)']);
      }
      expect(validateSecurity(deep(50) as never, { maxDepth: 10 }).errors).toEqual(['Object too deep: 51 levels (max: 10)']);
      expect(validateSecurity(deep(1500) as never, { maxDepth: 5000, maxKeys: 1e6 }).valid).toBe(true);
      expect(() => secureStringify(deep(20000), { maxDepth: 5 })).toThrow('Security validation failed: Object too deep: over 1000 levels');
      expect(() => secureStringify(circular, { sanitize: true, maxDepth: 5 })).toThrow('Object too deep: over 1000 levels');
      expect(() => createSecureParser((() => deep(20000)) as never, { maxDepth: 5 })('q')).toThrow('Object too deep: over 1000 levels');
      expect(createSecureParser({ maxDepth: 3 })('a[b]=1')).toEqual({ a: { b: '1' } });
    });

    it('checks for prototype pollution in linear time (F067)', () => {
      const started = Date.now();
      expect(hasPrototypePollution(deep(500))).toBe(false);
      expect(hasPrototypePollution(deep(30))).toBe(false);
      expect(validateSecurity(deep(30) as never, { maxDepth: 100 }).valid).toBe(true);
      expect(Date.now() - started).toBeLessThan(1000);
      expect(hasPrototypePollution(JSON.parse('{"a":'.repeat(30) + '{"__proto__":1}' + '}'.repeat(30)))).toBe(true);
      expect(hasPrototypePollution(Object.defineProperty({}, 'prototype', { value: 1, enumerable: false }))).toBe(true);
    });
  });
});
