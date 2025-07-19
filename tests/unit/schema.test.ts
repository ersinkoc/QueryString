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
      expect(schema.parse(undefined)).toBe(defaultDate);
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
      expect(schema.parse(undefined)).toBe(defaultArray);
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
});