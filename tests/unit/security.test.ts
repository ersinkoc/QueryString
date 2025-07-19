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
});