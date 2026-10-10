import { q, schema, validate, isValid } from '../../src/schema';

describe('Schema Validation', () => {
  describe('string schema', () => {
    const stringSchema = q.string();

    it('should validate strings', () => {
      expect(stringSchema.parse('hello')).toBe('hello');
      expect(() => stringSchema.parse(123)).toThrow('Expected string');
      expect(() => stringSchema.parse(null)).toThrow('Expected string');
    });

    it('should handle min length', () => {
      const schema = q.string().min(3);
      expect(schema.parse('abc')).toBe('abc');
      expect(() => schema.parse('ab')).toThrow('at least 3 characters');
    });

    it('should handle max length', () => {
      const schema = q.string().max(3);
      expect(schema.parse('abc')).toBe('abc');
      expect(() => schema.parse('abcd')).toThrow('at most 3 characters');
    });

    it('should handle exact length', () => {
      const schema = q.string().length(3);
      expect(schema.parse('abc')).toBe('abc');
      expect(() => schema.parse('ab')).toThrow('exactly 3 characters');
      expect(() => schema.parse('abcd')).toThrow('exactly 3 characters');
    });

    it('should validate email', () => {
      const schema = q.string().email();
      expect(schema.parse('user@example.com')).toBe('user@example.com');
      expect(() => schema.parse('invalid-email')).toThrow('does not match pattern');
    });

    it('should validate URL', () => {
      const schema = q.string().url();
      expect(schema.parse('https://example.com')).toBe('https://example.com');
      expect(() => schema.parse('not-a-url')).toThrow('does not match pattern');
    });

    it('should validate UUID', () => {
      const schema = q.string().uuid();
      expect(schema.parse('123e4567-e89b-12d3-a456-426614174000')).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(() => schema.parse('not-a-uuid')).toThrow('does not match pattern');
    });

    it('should validate regex pattern', () => {
      const schema = q.string().regex(/^[A-Z]+$/);
      expect(schema.parse('ABC')).toBe('ABC');
      expect(() => schema.parse('abc')).toThrow('does not match pattern');
    });

    it('should validate startsWith', () => {
      const schema = q.string().startsWith('hello');
      expect(schema.parse('hello world')).toBe('hello world');
      expect(() => schema.parse('world hello')).toThrow('must start with');
    });

    it('should validate endsWith', () => {
      const schema = q.string().endsWith('world');
      expect(schema.parse('hello world')).toBe('hello world');
      expect(() => schema.parse('world hello')).toThrow('must end with');
    });

    it('should validate includes', () => {
      const schema = q.string().includes('test');
      expect(schema.parse('this is a test')).toBe('this is a test');
      expect(() => schema.parse('no match')).toThrow('must include');
    });

    it('should transform strings', () => {
      const schema = q.string().trim().toLowerCase();
      expect(schema.parse('  HELLO  ')).toBe('hello');
    });

    it('should chain transformations', () => {
      const schema = q.string().trim().toUpperCase();
      expect(schema.parse('  hello  ')).toBe('HELLO');
    });
  });

  describe('number schema', () => {
    const numberSchema = q.number();

    it('should validate numbers', () => {
      expect(numberSchema.parse(42)).toBe(42);
      expect(numberSchema.parse('42')).toBe(42);
      expect(() => numberSchema.parse('not a number')).toThrow('Expected number');
    });

    it('should handle min value', () => {
      const schema = q.number().min(10);
      expect(schema.parse(10)).toBe(10);
      expect(() => schema.parse(9)).toThrow('at least 10');
    });

    it('should handle max value', () => {
      const schema = q.number().max(10);
      expect(schema.parse(10)).toBe(10);
      expect(() => schema.parse(11)).toThrow('at most 10');
    });

    it('should validate integers', () => {
      const schema = q.number().int();
      expect(schema.parse(42)).toBe(42);
      expect(() => schema.parse(42.5)).toThrow('Expected integer');
    });

    it('should handle default values', () => {
      const schema = q.number().default(100);
      expect(schema.parse(undefined)).toBe(100);
      expect(schema.parse(42)).toBe(42);
    });

    it('should reject boolean values', () => {
      const schema = q.number();
      expect(() => schema.parse(true)).toThrow('Expected number, got boolean');
      expect(() => schema.parse(false)).toThrow('Expected number, got boolean');
    });

    it('should validate positive numbers', () => {
      const schema = q.number().positive();
      expect(schema.parse(1)).toBe(1);
      expect(() => schema.parse(0)).toThrow('Expected positive');
      expect(() => schema.parse(-1)).toThrow('Expected positive');
    });

    it('should validate negative numbers', () => {
      const schema = q.number().negative();
      expect(schema.parse(-1)).toBe(-1);
      expect(() => schema.parse(0)).toThrow('Expected negative');
      expect(() => schema.parse(1)).toThrow('Expected negative');
    });

    it('should validate non-positive numbers', () => {
      const schema = q.number().nonpositive();
      expect(schema.parse(0)).toBe(0);
      expect(schema.parse(-1)).toBe(-1);
      expect(() => schema.parse(1)).toThrow('Expected non-positive');
    });

    it('should validate non-negative numbers', () => {
      const schema = q.number().nonnegative();
      expect(schema.parse(0)).toBe(0);
      expect(schema.parse(1)).toBe(1);
      expect(() => schema.parse(-1)).toThrow('Expected non-negative');
    });

    it('should validate multiples', () => {
      const schema = q.number().multipleOf(5);
      expect(schema.parse(10)).toBe(10);
      expect(() => schema.parse(7)).toThrow('multiple of 5');
    });

    it('should validate finite numbers', () => {
      const schema = q.number().finite();
      expect(schema.parse(42)).toBe(42);
      expect(() => schema.parse(Infinity)).toThrow('Expected finite');
    });

    it('should validate safe integers', () => {
      const schema = q.number().safe();
      expect(schema.parse(42)).toBe(42);
      expect(() => schema.parse(Number.MAX_SAFE_INTEGER + 1)).toThrow('Expected safe integer');
    });
  });

  describe('boolean schema', () => {
    const booleanSchema = q.boolean();

    it('should validate booleans', () => {
      expect(booleanSchema.parse(true)).toBe(true);
      expect(booleanSchema.parse(false)).toBe(false);
    });

    it('should coerce string booleans', () => {
      expect(booleanSchema.parse('true')).toBe(true);
      expect(booleanSchema.parse('false')).toBe(false);
    });

    it('should coerce numeric booleans', () => {
      expect(booleanSchema.parse(1)).toBe(true);
      expect(booleanSchema.parse(0)).toBe(false);
      expect(booleanSchema.parse('1')).toBe(true);
      expect(booleanSchema.parse('0')).toBe(false);
    });

    it('should reject invalid values', () => {
      expect(() => booleanSchema.parse('yes')).toThrow('Expected boolean');
      expect(() => booleanSchema.parse({})).toThrow('Expected boolean');
    });

    it('should handle default values', () => {
      const schema = q.boolean().default(true);
      expect(schema.parse(undefined)).toBe(true);
      expect(schema.parse(false)).toBe(false);
    });
  });

  describe('date schema', () => {
    const dateSchema = q.date();

    it('should validate dates', () => {
      const date = new Date();
      expect(dateSchema.parse(date)).toBe(date);
    });

    it('should parse date strings', () => {
      const result = dateSchema.parse('2024-01-01');
      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString()).toBe('2024-01-01T00:00:00.000Z');
    });

    it('should parse timestamps', () => {
      const timestamp = Date.now();
      const result = dateSchema.parse(timestamp);
      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBe(timestamp);
    });

    it('should reject invalid dates', () => {
      expect(() => dateSchema.parse('invalid')).toThrow('Invalid date');
      expect(() => dateSchema.parse({})).toThrow('Expected date');
    });

    it('should validate min date', () => {
      const minDate = new Date('2024-01-01');
      const schema = q.date().min(minDate);
      expect(schema.parse('2024-06-01')).toBeInstanceOf(Date);
      expect(() => schema.parse('2023-12-31')).toThrow('must be after');
    });

    it('should validate max date', () => {
      const maxDate = new Date('2024-12-31');
      const schema = q.date().max(maxDate);
      expect(schema.parse('2024-06-01')).toBeInstanceOf(Date);
      expect(() => schema.parse('2025-01-01')).toThrow('must be before');
    });

    it('should handle default values', () => {
      const defaultDate = new Date('2024-01-01');
      const schema = q.date().default(defaultDate);
      expect(schema.parse(undefined)).toEqual(defaultDate); // [F050] a copy, not the shared instance
      expect(schema.parse('2024-12-31')).toBeInstanceOf(Date);
    });
  });

  describe('array schema', () => {
    it('should validate arrays', () => {
      const schema = q.array();
      expect(schema.parse([1, 2, 3])).toEqual([1, 2, 3]);
      expect(() => schema.parse('not array')).toThrow('Expected array');
    });

    it('should validate array items', () => {
      const schema = q.array(q.number());
      expect(schema.parse([1, 2, 3])).toEqual([1, 2, 3]);
      expect(() => schema.parse([1, 'two', 3])).toThrow('Invalid item at index 1');
    });

    it('should validate min length', () => {
      const schema = q.array().min(2);
      expect(schema.parse([1, 2])).toEqual([1, 2]);
      expect(() => schema.parse([1])).toThrow('at least 2 items');
    });

    it('should validate max length', () => {
      const schema = q.array().max(2);
      expect(schema.parse([1, 2])).toEqual([1, 2]);
      expect(() => schema.parse([1, 2, 3])).toThrow('at most 2 items');
    });

    it('should validate exact length', () => {
      const schema = q.array().length(2);
      expect(schema.parse([1, 2])).toEqual([1, 2]);
      expect(() => schema.parse([1])).toThrow('exactly 2 items');
      expect(() => schema.parse([1, 2, 3])).toThrow('exactly 2 items');
    });

    it('should validate non-empty arrays', () => {
      const schema = q.array().nonempty();
      expect(schema.parse([1])).toEqual([1]);
      expect(() => schema.parse([])).toThrow('must not be empty');
    });

    it('should handle default values', () => {
      const defaultArray = [1, 2, 3];
      const schema = q.array().default(defaultArray);
      expect(schema.parse(undefined)).toEqual(defaultArray); // [F050] a copy, not the shared instance
      expect(schema.parse(['a', 'b'])).toEqual(['a', 'b']);
    });
  });

  describe('object schema', () => {
    it('should validate objects', () => {
      const schema = q.object();
      expect(schema.parse({ foo: 'bar' })).toEqual({ foo: 'bar' });
      expect(() => schema.parse('not object')).toThrow('Expected object');
      expect(() => schema.parse(null)).toThrow('Expected object');
      expect(() => schema.parse([])).toThrow('Expected object');
    });

    it('should validate object shape', () => {
      const schema = q.object().shape({
        name: q.string(),
        age: q.number()
      });
      
      expect(schema.parse({ name: 'John', age: 30 })).toEqual({ name: 'John', age: 30 });
      expect(() => schema.parse({ name: 'John' })).toThrow('Invalid value for key "age"');
      expect(() => schema.parse({ name: 123, age: 30 })).toThrow('Invalid value for key "name"');
    });

    it('should handle strict mode', () => {
      const schema = q.object().shape({
        name: q.string()
      }).strict();
      
      expect(() => schema.parse({ name: 'John', extra: 'field' })).toThrow('Unknown key "extra"');
    });

    it('should handle passthrough mode', () => {
      const schema = q.object().shape({
        name: q.string()
      }).passthrough();
      
      expect(schema.parse({ name: 'John', extra: 'field' })).toEqual({ name: 'John', extra: 'field' });
    });

    it('should handle catchall', () => {
      const schema = q.object().shape({
        name: q.string()
      }).catchall(q.number());
      
      expect(schema.parse({ name: 'John', age: 30 })).toEqual({ name: 'John', age: 30 });
      expect(() => schema.parse({ name: 'John', age: 'thirty' })).toThrow('Invalid value for key "age"');
    });

    it('should pick keys', () => {
      const schema = q.object().shape({
        name: q.string(),
        age: q.number(),
        email: q.string()
      }).pick(['name', 'email']);
      
      expect(schema.parse({ name: 'John', email: 'john@example.com' })).toEqual({ name: 'John', email: 'john@example.com' });
    });

    it('should omit keys', () => {
      const schema = q.object().shape({
        name: q.string(),
        age: q.number(),
        email: q.string()
      }).omit(['age']);
      
      expect(schema.parse({ name: 'John', email: 'john@example.com' })).toEqual({ name: 'John', email: 'john@example.com' });
    });

    it('should extend schemas', () => {
      const baseSchema = q.object().shape({
        name: q.string()
      });
      
      const extendedSchema = baseSchema.extend({
        age: q.number()
      });
      
      expect(extendedSchema.parse({ name: 'John', age: 30 })).toEqual({ name: 'John', age: 30 });
    });

    it('should merge schemas', () => {
      const schema1 = q.object().shape({ name: q.string() });
      const schema2 = q.object().shape({ age: q.number() });
      const merged = schema1.merge(schema2);
      
      expect(merged.parse({ name: 'John', age: 30 })).toEqual({ name: 'John', age: 30 });
    });

    it('should create partial schemas', () => {
      const schema = q.object().shape({
        name: q.string(),
        age: q.number()
      }).partial();
      
      expect(schema.parse({})).toEqual({});
      expect(schema.parse({ name: 'John' })).toEqual({ name: 'John' });
      expect(schema.parse({ age: 30 })).toEqual({ age: 30 });
    });

    it('should throw when picking from object without shape', () => {
      const schema = q.object();
      expect(() => schema.pick(['name'])).toThrow('Cannot pick from object without shape');
    });

    it('should throw when omitting from object without shape', () => {
      const schema = q.object();
      expect(() => schema.omit(['name'])).toThrow('Cannot omit from object without shape');
    });

    it('should handle default values', () => {
      const defaultObject = { name: 'default', age: 0 };
      const schema = q.object().default(defaultObject);
      expect(schema.parse(undefined)).toStrictEqual(defaultObject);
      expect(schema.parse({ name: 'John' })).toEqual({ name: 'John' });
    });

    it('should handle partial without shape', () => {
      const schema = q.object();
      const partialSchema = schema.partial();
      expect(partialSchema).toBeDefined();
      expect(partialSchema.parse({})).toEqual({});
    });

    it('should support deepPartial method', () => {
      const schema = q.object();
      const deepPartialSchema = schema.deepPartial();
      expect(deepPartialSchema).toBeDefined();
      expect(deepPartialSchema.parse({})).toEqual({});
    });

    it('should support required method', () => {
      const schema = q.object();
      const requiredSchema = schema.required();
      expect(requiredSchema).toBeDefined();
      expect(requiredSchema.parse({})).toEqual({});
    });

    it('should support strip method', () => {
      const schema = q.object().strip();
      expect(schema).toBeDefined();
      expect(schema.parse({})).toEqual({});
    });
  });

  describe('enum schema', () => {
    it('should validate enum values', () => {
      const schema = q.enum('red', 'green', 'blue');
      expect(schema.parse('red')).toBe('red');
      expect(schema.parse('green')).toBe('green');
      expect(() => schema.parse('yellow')).toThrow('Expected one of red, green, blue');
    });


    it('should handle default values', () => {
      const schema = q.enum('red', 'green', 'blue').default('red');
      expect(schema.parse(undefined)).toBe('red');
      expect(schema.parse('blue')).toBe('blue');
    });
  });

  describe('union schema', () => {
    it('should validate union types', () => {
      const schema = q.union(q.string(), q.number());
      expect(schema.parse('hello')).toBe('hello');
      expect(schema.parse(42)).toBe(42);
      expect(() => schema.parse(true)).toThrow('Union validation failed');
    });

    it('should provide all errors for union', () => {
      const schema = q.union(q.string().min(5), q.number().min(10));
      try {
        schema.parse('hi');
      } catch (error: any) {
        expect(error.message).toContain('Union validation failed');
      }
    });

    it('should handle default values', () => {
      const schema = q.union(q.string(), q.number()).default('default');
      expect(schema.parse(undefined)).toBe('default');
      expect(schema.parse(42)).toBe(42);
    });
  });

  describe('literal schema', () => {
    it('should validate literal values', () => {
      const schema = q.literal('hello');
      expect(schema.parse('hello')).toBe('hello');
      expect(() => schema.parse('world')).toThrow('Expected hello');
    });

    it('should validate numeric literals', () => {
      const schema = q.literal(42);
      expect(schema.parse(42)).toBe(42);
      expect(() => schema.parse(43)).toThrow('Expected 42');
    });

    it('should validate boolean literals', () => {
      const schema = q.literal(true);
      expect(schema.parse(true)).toBe(true);
      expect(() => schema.parse(false)).toThrow('Expected true');
    });
  });

  describe('special schemas', () => {
    it('should validate any', () => {
      const schema = q.any();
      expect(schema.parse('string')).toBe('string');
      expect(schema.parse(123)).toBe(123);
      expect(schema.parse(null)).toBe(null);
      expect(schema.parse(undefined)).toBe(undefined);
    });

    it('should validate unknown', () => {
      const schema = q.unknown();
      expect(schema.parse('string')).toBe('string');
      expect(schema.parse(123)).toBe(123);
      expect(schema.parse(null)).toBe(null);
    });

    it('should validate null', () => {
      const schema = q.null();
      expect(schema.parse(null)).toBe(null);
      expect(() => schema.parse(undefined)).toThrow('Expected null');
      expect(() => schema.parse('')).toThrow('Expected null');
    });

    it('should validate undefined', () => {
      const schema = q.undefined();
      expect(schema.parse(undefined)).toBe(undefined);
      expect(() => schema.parse(null)).toThrow('Expected undefined');
      expect(() => schema.parse('')).toThrow('Expected undefined');
    });

    it('should validate void', () => {
      const schema = q.void();
      expect(schema.parse(undefined)).toBe(undefined);
      expect(() => schema.parse(null)).toThrow('Expected void');
    });
  });

  describe('modifiers', () => {
    it('should make schemas optional', () => {
      const schema = q.string().optional();
      expect(schema.parse('hello')).toBe('hello');
      expect(schema.parse(undefined)).toBe(undefined);
      expect(() => schema.parse(null)).toThrow('Expected string');
    });

    it('should make schemas nullable', () => {
      const schema = q.string().nullable();
      expect(schema.parse('hello')).toBe('hello');
      expect(schema.parse(null)).toBe(null);
      expect(() => schema.parse(undefined)).toThrow('Expected string');
    });

    it('should handle default values', () => {
      const schema = q.string().default('default');
      expect(schema.parse(undefined)).toBe('default');
      expect(schema.parse('custom')).toBe('custom');
    });

    it('should transform values', () => {
      const schema = q.number().transform((n) => n * 2);
      expect(schema.parse(5)).toBe(10);
    });

    it('should chain transforms', () => {
      const schema = q.number()
        .transform((n) => n * 2)
        .transform((n) => n + 1);
      expect(schema.parse(5)).toBe(11);
    });

    it('should refine values', () => {
      const schema = q.number().refine((n) => n % 2 === 0, 'Must be even');
      expect(schema.parse(4)).toBe(4);
      expect(() => schema.parse(3)).toThrow('Must be even');
    });

    it('should chain refinements', () => {
      const schema = q.number()
        .refine((n) => n > 0, 'Must be positive')
        .refine((n) => n < 100, 'Must be less than 100');
      expect(schema.parse(50)).toBe(50);
      expect(() => schema.parse(-1)).toThrow('Must be positive');
      expect(() => schema.parse(101)).toThrow('Must be less than 100');
    });
  });

  describe('safeParse', () => {
    it('should return success result', () => {
      const schema = q.string();
      const result = schema.safeParse('hello');
      expect(result).toEqual({ success: true, data: 'hello' });
    });

    it('should return error result', () => {
      const schema = q.string();
      const result = schema.safeParse(123);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0].message).toContain('Expected string');
    });
  });

  describe('helper functions', () => {
    it('should create object schema with shape helper', () => {
      const mySchema = schema({
        name: q.string(),
        age: q.number()
      });
      
      expect(mySchema.parse({ name: 'John', age: 30 })).toEqual({ name: 'John', age: 30 });
    });

    it('should validate with helper function', () => {
      const mySchema = q.string();
      expect(validate(mySchema, 'hello')).toBe('hello');
      expect(() => validate(mySchema, 123)).toThrow();
    });

    it('should check validity with helper function', () => {
      const mySchema = q.string();
      expect(isValid(mySchema, 'hello')).toBe(true);
      expect(isValid(mySchema, 123)).toBe(false);
    });
  });

  describe('number coercion and prototype-safe objects (audit F009/F010/F011)', () => {
    it('rejects empty and non-scalar values for numbers (F009)', () => {
      for (const bad of [null, '', '   ', [], [5], new Date(0), NaN]) {
        expect(() => q.number().parse(bad)).toThrow('Expected number');
      }
      expect(q.number().parse(' 12 ')).toBe(12);
      expect(q.number().parse('1e3')).toBe(1000);
      expect(q.number().default(7).parse(undefined)).toBe(7);
    });

    it('keeps __proto__ input from replacing the result prototype (F010)', () => {
      const payload = () => JSON.parse('{"a":"x","__proto__":{"admin":true}}');
      const results = [
        q.object().parse(payload()),
        q.object().shape({ a: q.string() }).passthrough().parse(payload()),
        q.object().shape({ a: q.string() }).catchall(q.object()).parse(payload()),
      ] as Array<Record<string, unknown>>;

      for (const result of results) {
        expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
        expect(result.admin).toBeUndefined();
        expect(Object.prototype.hasOwnProperty.call(result, '__proto__')).toBe(true);
      }
      expect(({} as Record<string, unknown>).admin).toBeUndefined();
    });

    it('does not treat Object.prototype members as declared keys (F011)', () => {
      const strict = q.object().shape({ a: q.string() }).strict();
      expect(() => strict.parse(JSON.parse('{"a":"x","constructor":"y"}'))).toThrow('Unknown key "constructor"');
      expect(() => strict.parse(JSON.parse('{"a":"x","toString":"y"}'))).toThrow('Unknown key "toString"');

      const kept = q.object().shape({ a: q.string() }).passthrough().parse(JSON.parse('{"a":"x","toString":"y"}')) as Record<string, unknown>;
      expect(Object.prototype.hasOwnProperty.call(kept, 'toString')).toBe(true);
      expect(kept.toString).toBe('y');

      expect(q.object().shape({ valueOf: q.string().optional() }).parse({}).valueOf).toBeUndefined();
    });
  });

  describe('regex state, fractional steps, derived object schemas (audit F028/F029/F030)', () => {
    it('validates repeatedly with global and sticky regular expressions (F028)', () => {
      for (const re of [/a/g, /^[a-z]+$/g, /a/y]) {
        const schema = q.string().regex(re);
        const input = re.source === '^[a-z]+$' ? 'abc' : 'a';
        expect([1, 2, 3, 4].map(() => schema.safeParse(input).success)).toEqual([true, true, true, true]);
      }
      const rejecting = q.string().regex(/a/g);
      expect(['a', 'b', 'a', 'b', 'a'].map((v) => rejecting.safeParse(v).success)).toEqual([true, false, true, false, true]);
    });

    it('accepts exact multiples of fractional steps (F029)', () => {
      for (const [value, step] of [[0.3, 0.1], [0.6, 0.1], [1.1, 0.1], [0.07, 0.01], [19.99, 0.01], [-0.3, 0.1], [7.5, 2.5]]) {
        expect(q.number().multipleOf(step).safeParse(value).success).toBe(true);
      }
      for (const [value, step] of [[0.35, 0.1], [0.001, 0.01], [2.5, 5], [100, 3], [5, 0]]) {
        expect(q.number().multipleOf(step).safeParse(value).success).toBe(false);
      }
    });

    it('keeps the unknown-key policy in derived object schemas (F030)', () => {
      const base = () => q.object().shape({ a: q.string(), b: q.string() });
      expect(() => base().strict().pick(['a']).parse({ a: 'x', z: 1 })).toThrow('Unknown key "z"');
      expect(() => base().strict().omit(['b']).parse({ a: 'x', z: 1 })).toThrow('Unknown key "z"');
      expect(() => base().strict().extend({ c: q.string() }).parse({ a: 'x', b: 'y', c: 'w', z: 1 })).toThrow('Unknown key "z"');
      expect(() => base().strict().partial().parse({ a: 'x', z: 1 })).toThrow('Unknown key "z"');
      expect(() => base().merge(q.object().shape({ c: q.string() }).strict()).parse({ a: 'x', b: 'y', c: 'w', z: 1 })).toThrow(
        'Unknown key "z"'
      );
      expect(base().passthrough().omit(['b']).parse({ a: 'x', z: 1 })).toEqual({ a: 'x', z: 1 });
      expect(base().pick(['a']).parse({ a: 'x', z: 1 })).toEqual({ a: 'x' });

      const catchall = q.object().shape({ a: q.string(), b: q.string() }).catchall(q.number()).pick(['a']);
      expect(catchall.parse({ a: 'x', n: 1 })).toEqual({ a: 'x', n: 1 });
      expect(() => catchall.parse({ a: 'x', n: 's' })).toThrow('Invalid value for key "n"');
    });
  });

  describe('string checks accumulate (F047) and email() is linear (F048)', () => {
    const accepts = (schema: { safeParse(v: unknown): { success: boolean } }, value: unknown) =>
      schema.safeParse(value).success;

    it('keeps every configured pattern / prefix / suffix / substring check', () => {
      expect(accepts(q.string().email().regex(/corp\.com$/), 'not-an-email-corp.com')).toBe(false);
      expect(accepts(q.string().email().regex(/@corp\.com$/), 'a@corp.com')).toBe(true);
      expect(accepts(q.string().regex(/corp\.com$/).email(), 'a@other.com')).toBe(false);
      expect(accepts(q.string().regex(/^a/).regex(/z$/), 'zzz')).toBe(false);
      expect(accepts(q.string().url().regex(/example\.com/), 'ftp-not-url example.com')).toBe(false);
      expect(accepts(q.string().startsWith('a').startsWith('b'), 'bxx')).toBe(false);
      expect(accepts(q.string().endsWith('a').endsWith('b'), 'xxb')).toBe(false);
      expect(accepts(q.string().includes('x').includes('y'), 'yy')).toBe(false);
      expect(accepts(q.string().startsWith('a').startsWith('ab').endsWith('z').includes('m').regex(/^a/), 'abmz')).toBe(true);
    });

    it('keeps the email semantics and rejects a long dotted invalid value quickly', () => {
      const email = q.string().email();
      const cases: Array<[string, boolean]> = [
        ['a@b.c', true],
        ['a@b..c', true],
        ['a b@c.d', false],
        ['a@b', false],
        ['a@@b.c', false],
        ['a@b.', false],
      ];
      for (const [value, expected] of cases) {
        expect(accepts(email, value)).toBe(expected);
      }
      const started = Date.now();
      expect(accepts(email, `a@${'a.'.repeat(40000)} `)).toBe(false);
      expect(Date.now() - started).toBeLessThan(1000);
    });
  });

  describe('object modifiers and defaults (F049, F050, F051)', () => {
    const base = () => q.object().shape({ a: q.string(), n: q.number() });

    it('required() restores required fields and does not mutate the source', () => {
      const partial = base().partial();
      expect(partial.required().safeParse({}).success).toBe(false);
      expect(partial.required().safeParse({ a: 'x', n: 1 })).toEqual({ success: true, data: { a: 'x', n: 1 } });
      expect(partial.safeParse({}).success).toBe(true);
      expect(q.object().shape({ a: q.string().nullable().optional() }).required().safeParse({ a: null }).success).toBe(true);
      expect(q.object().shape({ a: q.string().optional() }).strict().required().safeParse({ a: 'x', b: 1 }).success).toBe(false);
    });

    it('strip() leaves strict / passthrough / catchall mode', () => {
      expect(base().passthrough().strip().safeParse({ a: 'x', n: 1, extra: 1 })).toEqual({ success: true, data: { a: 'x', n: 1 } });
      expect(base().strict().strip().safeParse({ a: 'x', n: 1, extra: 1 }).success).toBe(true);
      expect(q.object().shape({ a: q.string() }).catchall(q.number()).strip().safeParse({ a: 'x', b: 'no' }).success).toBe(true);
    });

    it('deepPartial() makes nested object fields optional without touching the source', () => {
      const nested = q.object().shape({ o: q.object().shape({ a: q.string() }) });
      expect(nested.deepPartial().safeParse({}).success).toBe(true);
      expect(nested.deepPartial().safeParse({ o: {} }).success).toBe(true);
      expect(nested.deepPartial().safeParse({ o: { a: 1 } }).success).toBe(false);
      expect(nested.safeParse({ o: {} }).success).toBe(false);
      expect(q.object().deepPartial().safeParse({ z: 1 }).success).toBe(true);
    });

    it('returns an independent copy of a default on every parse (F050)', () => {
      const list = q.array().default([]);
      (list.parse(undefined) as unknown[]).push(1);
      expect(list.parse(undefined)).toEqual([]);
      const nested = q.array().default([[1], { a: [2] }]);
      const first = nested.parse(undefined) as Array<number[] | { a: number[] }>;
      (first[0] as number[]).push(9);
      (first[1] as { a: number[] }).a.push(9);
      expect(nested.parse(undefined)).toEqual([[1], { a: [2] }]);
      const date = q.date().default(new Date(0));
      date.parse(undefined).setUTCFullYear(2000);
      expect(date.parse(undefined).toISOString()).toBe('1970-01-01T00:00:00.000Z');
      expect(q.array().default([1]).parse([2])).toEqual([2]);
    });

    it('applies a default set on optional() / nullable() wrappers (F051)', () => {
      expect(q.string().optional().default('x').parse(undefined)).toBe('x');
      expect(q.string().optional().default('x').parse('y')).toBe('y');
      expect(q.string().nullable().default('x').parse(undefined)).toBe('x');
      expect(q.string().nullable().default('x').parse(null)).toBe(null);
      expect(q.object().shape({ a: q.number().optional().default(5) }).parse({})).toEqual({ a: 5 });
      expect(q.string().optional().parse(undefined)).toBeUndefined();
    });
  });

  describe('primitive schemas honour refine / transform / default (F052)', () => {
    it('runs refinements and transforms for literal / any / unknown / null / undefined / void', () => {
      expect(q.any().refine((v) => v !== 'bad', 'no').safeParse('bad').success).toBe(false);
      expect(q.unknown().refine((v) => v !== 'bad').safeParse('bad').success).toBe(false);
      expect(q.literal('a').refine(() => false, 'nope').safeParse('a').success).toBe(false);
      expect(q.literal(5).refine((v) => v === 5).transform((v) => v + 1).parse(5)).toBe(6);
      expect(q.any().transform((v) => String(v)).parse(7)).toBe('7');
      expect(q.null().refine(() => false).safeParse(null).success).toBe(false);
      expect(q.undefined().transform(() => 'u').parse(undefined)).toBe('u');
      expect(q.void().refine(() => false).safeParse(undefined).success).toBe(false);
      expect(q.literal('a').safeParse('b').success).toBe(false);
    });

    it('applies defaults for literal / any / unknown / null', () => {
      expect(q.unknown().default(3).parse(undefined)).toBe(3);
      expect(q.literal('a').default('a').parse(undefined)).toBe('a');
      expect(q.unknown().default(3).parse(4)).toBe(4);
      expect(q.null().default(null).parse(undefined)).toBe(null);
    });
  });

  // [F053] ts-jest type-checks this block: literal() / any() / transform() results must be usable as schema members.
  describe('plain BaseSchema members in object / union schemas (F053)', () => {
    it('composes literal(), any(), unknown(), null() and transform() results', () => {
      const status = q.union(q.literal('a'), q.literal('b'));
      const picked: 'a' | 'b' = status.parse('a');
      const shaped = q.object().shape({
        n: q.string().transform((s) => Number(s)),
        k: q.literal('x'),
        a: q.any(),
        u: q.unknown(),
        z: q.null(),
      });
      const result: { n: number } = shaped.parse({ n: '2', k: 'x', a: 1, u: 2, z: null });
      expect(picked).toBe('a');
      expect(result.n).toBe(2);
      expect(schema({ k: q.literal('x') }).safeParse({ k: 'y' }).success).toBe(false);
      expect(q.object().catchall(q.literal('x')).safeParse({ extra: 'x' }).success).toBe(true);
      expect(q.object().shape({ a: q.string() }).extend({ k: q.literal(1) }).safeParse({ a: 's', k: 1 }).success).toBe(true);
    });
  });

  describe('modifiers do not mutate the receiver (F068)', () => {
    it('keeps sibling schemas derived from a shared base independent', () => {
      const base = q.string();
      const short = base.max(3);
      const long = base.max(10);
      expect(short.safeParse('abcdef').success).toBe(false);
      expect(long.safeParse('abcdef').success).toBe(true);
      expect(base.safeParse('abcdef').success).toBe(true);
      expect(short).not.toBe(base);

      const id = q.string();
      const a = id.transform((s) => `${s}A`);
      const b = id.transform((s) => `${s}B`);
      expect([a.parse('x'), b.parse('x'), id.parse('x')]).toEqual(['xA', 'xB', 'x']);
    });

    it('does not leak refine / default / trim / email / min / strict / shape into the base', () => {
      const number = q.number();
      number.refine((n) => n > 10, 'big');
      expect(number.safeParse(1).success).toBe(true);
      const text = q.string();
      text.default('d');
      text.trim().toLowerCase();
      text.email();
      expect(text.safeParse(undefined).success).toBe(false);
      expect(text.parse('  AB ')).toBe('  AB ');
      expect(text.safeParse('not an email').success).toBe(true);
      const list = q.array(q.number());
      list.min(2);
      expect(list.safeParse([]).success).toBe(true);
      const object = q.object().shape({ a: q.string() });
      expect(object.strict().safeParse({ a: 'x', b: 1 }).success).toBe(false);
      expect(object.safeParse({ a: 'x', b: 1 }).success).toBe(true);
      const free = q.object();
      const x = free.shape({ a: q.string() });
      const y = free.shape({ b: q.number() });
      expect([x.safeParse({ b: 1 }).success, y.safeParse({ a: 'x' }).success, free.safeParse({ z: 1 }).success]).toEqual([false, false, true]);
    });

    it('still accumulates checks along one chain', () => {
      const s = q.string().trim().min(2).max(4).toLowerCase();
      expect(s.parse('  ABC ')).toBe('abc');
      expect(s.safeParse('  A ').success).toBe(false);
      expect(q.string().transform((v) => `${v}1`).transform((v) => `${v}2`).parse('x')).toBe('x12');
      expect(q.number().refine((n) => n > 1, 'gt1').refine((n) => n < 5, 'lt5').safeParse(9).success).toBe(false);
    });
  });
});
