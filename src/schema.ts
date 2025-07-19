import {
  SchemaType,
  BaseSchema,
  StringSchema,
  NumberSchema,
  BooleanSchema,
  DateSchema,
  ArraySchema,
  ObjectSchema,
  EnumSchema,
  UnionSchema,
  OptionalSchema,
  NullableSchema,
  SchemaValidationResult,
} from './types';

abstract class BaseSchemaImpl<T> implements BaseSchema<T> {
  abstract type: string;
  protected _default?: T;
  protected _transforms: Array<(value: T) => any> = [];
  protected _refinements: Array<{ fn: (value: T) => boolean; message: string }> = [];

  abstract parse(value: unknown): T;

  safeParse(value: unknown): SchemaValidationResult<T> {
    try {
      const data = this.parse(value);
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        errors: [{
          path: '',
          message: error instanceof Error ? error.message : 'Validation failed',
          value,
        }],
      };
    }
  }

  optional(): OptionalSchema<T> {
    return new OptionalSchemaImpl(this);
  }

  nullable(): NullableSchema<T> {
    return new NullableSchemaImpl(this);
  }

  default(value: T): this {
    this._default = value;
    return this;
  }

  transform<U>(fn: (value: T) => U): BaseSchema<U> {
    const schema = this as any;
    schema._transforms.push(fn);
    return schema;
  }

  refine(fn: (value: T) => boolean, message = 'Validation failed'): this {
    this._refinements.push({ fn, message });
    return this;
  }

  protected applyTransforms(value: T): any {
    let result: any = value;
    for (const transform of this._transforms) {
      result = transform(result);
    }
    return result;
  }

  protected applyRefinements(value: T): void {
    for (const { fn, message } of this._refinements) {
      if (!fn(value)) {
        throw new Error(message);
      }
    }
  }
}

class StringSchemaImpl extends BaseSchemaImpl<string> implements StringSchema {
  type = 'string' as const;
  private _min?: number;
  private _max?: number;
  private _length?: number;
  private _regex?: RegExp;
  private _startsWith?: string;
  private _endsWith?: string;
  private _includes?: string;
  private _trim = false;
  private _toLowerCase = false;
  private _toUpperCase = false;

  parse(value: unknown): string {
    if (value === undefined && this._default !== undefined) {
      value = this._default;
    }

    if (typeof value !== 'string') {
      throw new Error(`Expected string, got ${typeof value}`);
    }

    let str = value;

    if (this._trim) str = str.trim();
    if (this._toLowerCase) str = str.toLowerCase();
    if (this._toUpperCase) str = str.toUpperCase();

    if (this._length !== undefined && str.length !== this._length) {
      throw new Error(`String must be exactly ${this._length} characters`);
    }
    if (this._min !== undefined && str.length < this._min) {
      throw new Error(`String must be at least ${this._min} characters`);
    }
    if (this._max !== undefined && str.length > this._max) {
      throw new Error(`String must be at most ${this._max} characters`);
    }
    if (this._regex && !this._regex.test(str)) {
      throw new Error(`String does not match pattern`);
    }
    if (this._startsWith && !str.startsWith(this._startsWith)) {
      throw new Error(`String must start with "${this._startsWith}"`);
    }
    if (this._endsWith && !str.endsWith(this._endsWith)) {
      throw new Error(`String must end with "${this._endsWith}"`);
    }
    if (this._includes && !str.includes(this._includes)) {
      throw new Error(`String must include "${this._includes}"`);
    }

    this.applyRefinements(str);
    return this.applyTransforms(str);
  }

  min(length: number): this {
    this._min = length;
    return this;
  }

  max(length: number): this {
    this._max = length;
    return this;
  }

  length(length: number): this {
    this._length = length;
    return this;
  }

  email(): this {
    this._regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return this;
  }

  url(): this {
    this._regex = /^https?:\/\/.+/;
    return this;
  }

  uuid(): this {
    this._regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return this;
  }

  regex(pattern: RegExp): this {
    this._regex = pattern;
    return this;
  }

  startsWith(prefix: string): this {
    this._startsWith = prefix;
    return this;
  }

  endsWith(suffix: string): this {
    this._endsWith = suffix;
    return this;
  }

  includes(substring: string): this {
    this._includes = substring;
    return this;
  }

  trim(): this {
    this._trim = true;
    return this;
  }

  toLowerCase(): this {
    this._toLowerCase = true;
    return this;
  }

  toUpperCase(): this {
    this._toUpperCase = true;
    return this;
  }
}

class NumberSchemaImpl extends BaseSchemaImpl<number> implements NumberSchema {
  type = 'number' as const;
  private _min?: number;
  private _max?: number;
  private _int = false;
  private _positive = false;
  private _negative = false;
  private _nonpositive = false;
  private _nonnegative = false;
  private _multipleOf?: number;
  private _finite = false;
  private _safe = false;

  parse(value: unknown): number {
    if (value === undefined && this._default !== undefined) {
      value = this._default;
    }

    // Reject boolean values explicitly
    if (typeof value === 'boolean') {
      throw new Error(`Expected number, got ${typeof value}`);
    }

    const num = Number(value);
    if (isNaN(num)) {
      throw new Error(`Expected number, got ${typeof value}`);
    }

    if (this._int && !Number.isInteger(num)) {
      throw new Error('Expected integer');
    }
    if (this._positive && num <= 0) {
      throw new Error('Expected positive number');
    }
    if (this._negative && num >= 0) {
      throw new Error('Expected negative number');
    }
    if (this._nonpositive && num > 0) {
      throw new Error('Expected non-positive number');
    }
    if (this._nonnegative && num < 0) {
      throw new Error('Expected non-negative number');
    }
    if (this._min !== undefined && num < this._min) {
      throw new Error(`Number must be at least ${this._min}`);
    }
    if (this._max !== undefined && num > this._max) {
      throw new Error(`Number must be at most ${this._max}`);
    }
    if (this._multipleOf !== undefined && num % this._multipleOf !== 0) {
      throw new Error(`Number must be a multiple of ${this._multipleOf}`);
    }
    if (this._finite && !Number.isFinite(num)) {
      throw new Error('Expected finite number');
    }
    if (this._safe && !Number.isSafeInteger(num)) {
      throw new Error('Expected safe integer');
    }

    this.applyRefinements(num);
    return this.applyTransforms(num);
  }

  min(value: number): this {
    this._min = value;
    return this;
  }

  max(value: number): this {
    this._max = value;
    return this;
  }

  int(): this {
    this._int = true;
    return this;
  }

  positive(): this {
    this._positive = true;
    return this;
  }

  negative(): this {
    this._negative = true;
    return this;
  }

  nonpositive(): this {
    this._nonpositive = true;
    return this;
  }

  nonnegative(): this {
    this._nonnegative = true;
    return this;
  }

  multipleOf(value: number): this {
    this._multipleOf = value;
    return this;
  }

  finite(): this {
    this._finite = true;
    return this;
  }

  safe(): this {
    this._safe = true;
    return this;
  }
}

class BooleanSchemaImpl extends BaseSchemaImpl<boolean> implements BooleanSchema {
  type = 'boolean' as const;

  parse(value: unknown): boolean {
    if (value === undefined && this._default !== undefined) {
      value = this._default;
    }

    if (typeof value === 'boolean') {
      this.applyRefinements(value);
      return this.applyTransforms(value);
    }

    if (value === 'true' || value === 1 || value === '1') {
      this.applyRefinements(true);
      return this.applyTransforms(true);
    }

    if (value === 'false' || value === 0 || value === '0') {
      this.applyRefinements(false);
      return this.applyTransforms(false);
    }

    throw new Error(`Expected boolean, got ${typeof value}`);
  }
}

class DateSchemaImpl extends BaseSchemaImpl<Date> implements DateSchema {
  type = 'date' as const;
  private _min?: Date;
  private _max?: Date;

  parse(value: unknown): Date {
    if (value === undefined && this._default !== undefined) {
      value = this._default;
    }

    let date: Date;

    if (value instanceof Date) {
      date = value;
    } else if (typeof value === 'string' || typeof value === 'number') {
      date = new Date(value);
    } else {
      throw new Error(`Expected date, got ${typeof value}`);
    }

    if (isNaN(date.getTime())) {
      throw new Error('Invalid date');
    }

    if (this._min && date < this._min) {
      throw new Error(`Date must be after ${this._min.toISOString()}`);
    }
    if (this._max && date > this._max) {
      throw new Error(`Date must be before ${this._max.toISOString()}`);
    }

    this.applyRefinements(date);
    return this.applyTransforms(date);
  }

  min(date: Date): this {
    this._min = date;
    return this;
  }

  max(date: Date): this {
    this._max = date;
    return this;
  }
}

class ArraySchemaImpl<T> extends BaseSchemaImpl<T[]> implements ArraySchema<T> {
  type = 'array' as const;
  private _min?: number;
  private _max?: number;
  private _length?: number;
  private _nonempty = false;
  private _itemSchema?: BaseSchema<T>;

  constructor(itemSchema?: BaseSchema<T>) {
    super();
    this._itemSchema = itemSchema;
  }

  parse(value: unknown): T[] {
    if (value === undefined && this._default !== undefined) {
      value = this._default;
    }

    if (!Array.isArray(value)) {
      throw new Error(`Expected array, got ${typeof value}`);
    }

    if (this._length !== undefined && value.length !== this._length) {
      throw new Error(`Array must have exactly ${this._length} items`);
    }
    if (this._min !== undefined && value.length < this._min) {
      throw new Error(`Array must have at least ${this._min} items`);
    }
    if (this._max !== undefined && value.length > this._max) {
      throw new Error(`Array must have at most ${this._max} items`);
    }
    if (this._nonempty && value.length === 0) {
      throw new Error('Array must not be empty');
    }

    const parsed = this._itemSchema
      ? value.map((item, index) => {
          try {
            return this._itemSchema!.parse(item);
          } catch (error) {
            throw new Error(`Invalid item at index ${index}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        })
      : value;

    this.applyRefinements(parsed);
    return this.applyTransforms(parsed);
  }

  min(length: number): this {
    this._min = length;
    return this;
  }

  max(length: number): this {
    this._max = length;
    return this;
  }

  length(length: number): this {
    this._length = length;
    return this;
  }

  nonempty(): this {
    this._nonempty = true;
    return this;
  }
}

class ObjectSchemaImpl<T extends Record<string, unknown>> extends BaseSchemaImpl<T> implements ObjectSchema<T> {
  type = 'object' as const;
  private _shape?: Record<string, BaseSchema<unknown>>;
  private _strict = false;
  private _passthrough = false;
  // private _strip = false; // unused variable
  private _catchall?: BaseSchema<unknown>;

  parse(value: unknown): T {
    if (value === undefined && this._default !== undefined) {
      value = this._default;
    }

    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new Error(`Expected object, got ${typeof value}`);
    }

    const result: Record<string, unknown> = {};
    const input = value as Record<string, unknown>;

    if (this._shape) {
      for (const [key, schema] of Object.entries(this._shape)) {
        try {
          result[key] = schema.parse(input[key]);
        } catch (error) {
          throw new Error(`Invalid value for key "${key}": ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      for (const key of Object.keys(input)) {
        if (!(key in this._shape)) {
          if (this._strict) {
            throw new Error(`Unknown key "${key}"`);
          } else if (this._passthrough) {
            result[key] = input[key];
          } else if (this._catchall) {
            try {
              result[key] = this._catchall.parse(input[key]);
            } catch (error) {
              throw new Error(`Invalid value for key "${key}": ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }
      }
    } else {
      Object.assign(result, input);
    }

    this.applyRefinements(result as T);
    return this.applyTransforms(result as T);
  }

  shape<S extends Record<string, SchemaType>>(shape: S): ObjectSchema<{ [K in keyof S]: S[K] extends BaseSchema<infer U> ? U : never }> {
    this._shape = shape as any;
    return this as any;
  }

  strict(): this {
    this._strict = true;
    this._passthrough = false;
    return this;
  }

  passthrough(): this {
    this._passthrough = true;
    this._strict = false;
    return this;
  }

  strip(): this {
    // this._strip = true; // Property was commented out earlier
    return this;
  }

  catchall(schema: SchemaType): this {
    this._catchall = schema as BaseSchema<unknown>;
    return this;
  }

  pick<K extends keyof T>(keys: K[]): ObjectSchema<Pick<T, K>> {
    if (!this._shape) {
      throw new Error('Cannot pick from object without shape');
    }

    const newShape: Record<string, BaseSchema<unknown>> = {};
    for (const key of keys) {
      if (key in this._shape) {
        newShape[key as string] = this._shape[key as string];
      }
    }

    const schema = new ObjectSchemaImpl<Pick<T, K>>();
    schema._shape = newShape;
    return schema;
  }

  omit<K extends keyof T>(keys: K[]): ObjectSchema<Omit<T, K>> {
    if (!this._shape) {
      throw new Error('Cannot omit from object without shape');
    }

    const keySet = new Set(keys);
    const newShape: Record<string, BaseSchema<unknown>> = {};
    
    for (const [key, value] of Object.entries(this._shape)) {
      if (!keySet.has(key as K)) {
        newShape[key] = value;
      }
    }

    const schema = new ObjectSchemaImpl<Omit<T, K>>();
    schema._shape = newShape;
    return schema;
  }

  extend<S extends Record<string, SchemaType>>(extension: S): ObjectSchema<T & { [K in keyof S]: S[K] extends BaseSchema<infer U> ? U : never }> {
    const newShape = { ...(this._shape || {}), ...extension };
    const schema = new ObjectSchemaImpl<T & { [K in keyof S]: S[K] extends BaseSchema<infer U> ? U : never }>();
    schema._shape = newShape as any;
    return schema;
  }

  merge<S extends Record<string, unknown>>(other: ObjectSchema<S>): ObjectSchema<T & S> {
    const otherImpl = other as ObjectSchemaImpl<S>;
    const newShape = { ...(this._shape || {}), ...(otherImpl._shape || {}) };
    const schema = new ObjectSchemaImpl<T & S>();
    schema._shape = newShape;
    return schema;
  }

  partial(): ObjectSchema<Partial<T>> {
    if (!this._shape) {
      return this as any;
    }

    const newShape: Record<string, BaseSchema<unknown>> = {};
    for (const [key, value] of Object.entries(this._shape)) {
      newShape[key] = value.optional();
    }

    const schema = new ObjectSchemaImpl<Partial<T>>();
    schema._shape = newShape;
    return schema;
  }

  deepPartial(): ObjectSchema<DeepPartial<T>> {
    return this as any;
  }

  required(): ObjectSchema<Required<T>> {
    return this as any;
  }
}

class EnumSchemaImpl<T extends readonly [string, ...string[]]> extends BaseSchemaImpl<T[number]> implements EnumSchema<T> {
  type = 'enum' as const;
  options: T;

  constructor(options: T) {
    super();
    this.options = options;
  }

  parse(value: unknown): T[number] {
    if (value === undefined && this._default !== undefined) {
      value = this._default;
    }

    if (!this.options.includes(value as string)) {
      throw new Error(`Expected one of ${this.options.join(', ')}, got ${value}`);
    }

    this.applyRefinements(value as T[number]);
    return this.applyTransforms(value as T[number]);
  }
}

class UnionSchemaImpl<T extends readonly SchemaType[]> extends BaseSchemaImpl<any> implements UnionSchema<T> {
  type = 'union' as const;
  options: T;

  constructor(options: T) {
    super();
    this.options = options;
  }

  parse(value: unknown): any {
    if (value === undefined && this._default !== undefined) {
      value = this._default;
    }

    const errors: string[] = [];

    for (const schema of this.options) {
      try {
        const result = (schema as BaseSchema<unknown>).parse(value);
        this.applyRefinements(result);
        return this.applyTransforms(result);
      } catch (error) {
        errors.push(error instanceof Error ? error.message : 'Unknown error');
      }
    }

    throw new Error(`Union validation failed: ${errors.join('; ')}`);
  }
}

class OptionalSchemaImpl<T> extends BaseSchemaImpl<T | undefined> implements OptionalSchema<T> {
  type = 'optional' as const;
  innerType: BaseSchema<T>;

  constructor(innerType: BaseSchema<T>) {
    super();
    this.innerType = innerType;
  }

  parse(value: unknown): T | undefined {
    if (value === undefined) {
      return undefined;
    }

    const result = this.innerType.parse(value);
    this.applyRefinements(result);
    return this.applyTransforms(result);
  }
}

class NullableSchemaImpl<T> extends BaseSchemaImpl<T | null> implements NullableSchema<T> {
  type = 'nullable' as const;
  innerType: BaseSchema<T>;

  constructor(innerType: BaseSchema<T>) {
    super();
    this.innerType = innerType;
  }

  parse(value: unknown): T | null {
    if (value === null) {
      return null;
    }

    const result = this.innerType.parse(value);
    this.applyRefinements(result);
    return this.applyTransforms(result);
  }
}

type DeepPartial<T> = T extends object ? {
  [P in keyof T]?: DeepPartial<T[P]>;
} : T;

export const q = {
  string: (): StringSchema => new StringSchemaImpl(),
  number: (): NumberSchema => new NumberSchemaImpl(),
  boolean: (): BooleanSchema => new BooleanSchemaImpl(),
  date: (): DateSchema => new DateSchemaImpl(),
  array: <T>(schema?: BaseSchema<T>): ArraySchema<T> => new ArraySchemaImpl(schema),
  object: <T extends Record<string, unknown> = Record<string, unknown>>(): ObjectSchema<T> => new ObjectSchemaImpl<T>(),
  enum: <T extends readonly [string, ...string[]]>(...values: T): EnumSchema<T> => new EnumSchemaImpl(values),
  union: <T extends readonly SchemaType[]>(...schemas: T): UnionSchema<T> => new UnionSchemaImpl(schemas),
  literal: <T extends string | number | boolean>(value: T): BaseSchema<T> => {
    return new (class extends BaseSchemaImpl<T> {
      type = 'literal' as const;
      parse(input: unknown): T {
        if (input !== value) {
          throw new Error(`Expected ${value}, got ${input}`);
        }
        return value;
      }
    })();
  },
  any: (): BaseSchema<any> => {
    return new (class extends BaseSchemaImpl<any> {
      type = 'any' as const;
      parse(value: unknown): any {
        return value;
      }
    })();
  },
  unknown: (): BaseSchema<unknown> => {
    return new (class extends BaseSchemaImpl<unknown> {
      type = 'unknown' as const;
      parse(value: unknown): unknown {
        return value;
      }
    })();
  },
  null: (): BaseSchema<null> => {
    return new (class extends BaseSchemaImpl<null> {
      type = 'null' as const;
      parse(value: unknown): null {
        if (value !== null) {
          throw new Error(`Expected null, got ${typeof value}`);
        }
        return null;
      }
    })();
  },
  undefined: (): BaseSchema<undefined> => {
    return new (class extends BaseSchemaImpl<undefined> {
      type = 'undefined' as const;
      parse(value: unknown): undefined {
        if (value !== undefined) {
          throw new Error(`Expected undefined, got ${typeof value}`);
        }
        return undefined;
      }
    })();
  },
  void: (): BaseSchema<void> => {
    return new (class extends BaseSchemaImpl<void> {
      type = 'void' as const;
      parse(value: unknown): void {
        if (value !== undefined) {
          throw new Error(`Expected void, got ${typeof value}`);
        }
        return undefined as void;
      }
    })();
  },
};

export function schema<T extends Record<string, SchemaType>>(shape: T): ObjectSchema<{ [K in keyof T]: T[K] extends BaseSchema<infer U> ? U : never }> {
  return q.object().shape(shape);
}

export function validate<T>(schema: BaseSchema<T>, value: unknown): T {
  return schema.parse(value);
}

export function isValid<T>(schema: BaseSchema<T>, value: unknown): boolean {
  return schema.safeParse(value).success;
}