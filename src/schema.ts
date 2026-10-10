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
import { hasOwn } from './utils/object';

// [F029] `%` is wrong for fractional steps (0.3 % 0.1 === 0.0999...); compare the quotient to an integer.
function isMultipleOf(value: number, step: number): boolean {
  if (Number.isInteger(value) && Number.isInteger(step)) {
    return value % step === 0;
  }
  const ratio = value / step;
  return Number.isFinite(ratio) && Math.abs(ratio - Math.round(ratio)) < 1e-9;
}

// [F010] Plain assignment of '__proto__' would replace the target's prototype.
function setOwn(target: Record<string, unknown>, key: string, value: unknown): void {
  if (key === '__proto__') {
    Object.defineProperty(target, key, {
      value,
      writable: true,
      enumerable: true,
      configurable: true,
    });
    return;
  }
  target[key] = value;
}

// [F050] A default is handed out per parse; mutable defaults (arrays, dates, plain objects) are copied so callers cannot change them.
function cloneDefault<V>(value: V): V {
  if (value instanceof Date) {
    return new Date(value.getTime()) as unknown as V;
  }
  if (Array.isArray(value)) {
    return value.map((item) => cloneDefault(item)) as unknown as V;
  }
  if (value !== null && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    const copy: Record<string, unknown> = {};
    for (const key of Object.keys(value)) {
      setOwn(copy, key, cloneDefault((value as Record<string, unknown>)[key]));
    }
    return copy as V;
  }
  return value;
}

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
    const copy = this.clone();
    copy._default = value;
    return copy;
  }

  // [F068] Modifiers return a modified copy; the receiver (often a shared base schema) is never changed.
  protected clone(): this {
    const copy = Object.create(Object.getPrototypeOf(this)) as this;
    const source = this as unknown as Record<string, unknown>;
    const target = copy as unknown as Record<string, unknown>;
    for (const key of Object.keys(source)) {
      const value = source[key];
      target[key] = Array.isArray(value) ? value.slice() : value;
    }
    return copy;
  }

  protected defaultValue(): T | undefined {
    return cloneDefault(this._default);
  }

  transform<U>(fn: (value: T) => U): BaseSchema<U> {
    const copy = this.clone() as unknown as BaseSchemaImpl<U>;
    (copy as unknown as { _transforms: Array<(value: unknown) => unknown> })._transforms.push(
      fn as (value: unknown) => unknown
    );
    return copy;
  }

  refine(fn: (value: T) => boolean, message = 'Validation failed'): this {
    const copy = this.clone();
    copy._refinements.push({ fn, message });
    return copy;
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
  // [F047] Every configured check must pass; later calls add to earlier ones instead of replacing them.
  private _patterns: RegExp[] = [];
  private _startsWith: string[] = [];
  private _endsWith: string[] = [];
  private _includes: string[] = [];
  private _trim = false;
  private _toLowerCase = false;
  private _toUpperCase = false;

  parse(value: unknown): string {
    if (value === undefined && this._default !== undefined) {
      value = this.defaultValue();
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
    for (const pattern of this._patterns) {
      // [F028] test() on a /g or /y RegExp advances lastIndex; start every validation from 0.
      pattern.lastIndex = 0;
      if (!pattern.test(str)) {
        throw new Error(`String does not match pattern`);
      }
    }
    for (const prefix of this._startsWith) {
      if (!str.startsWith(prefix)) {
        throw new Error(`String must start with "${prefix}"`);
      }
    }
    for (const suffix of this._endsWith) {
      if (!str.endsWith(suffix)) {
        throw new Error(`String must end with "${suffix}"`);
      }
    }
    for (const substring of this._includes) {
      if (!str.includes(substring)) {
        throw new Error(`String must include "${substring}"`);
      }
    }

    this.applyRefinements(str);
    return this.applyTransforms(str);
  }

  min(length: number): this {
    const copy = this.clone();
    copy._min = length;
    return copy;
  }

  max(length: number): this {
    const copy = this.clone();
    copy._max = length;
    return copy;
  }

  length(length: number): this {
    const copy = this.clone();
    copy._length = length;
    return copy;
  }

  email(): this {
    const copy = this.clone();
    // [F048] The lookahead checks the domain once, so a failing match cannot backtrack quadratically.
    copy._patterns.push(/^[^\s@]+@(?=[^\s@]*$)[^\s@]+\.[^\s@]+$/);
    return copy;
  }

  url(): this {
    const copy = this.clone();
    copy._patterns.push(/^https?:\/\/.+/);
    return copy;
  }

  uuid(): this {
    const copy = this.clone();
    copy._patterns.push(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    return copy;
  }

  regex(pattern: RegExp): this {
    const copy = this.clone();
    copy._patterns.push(pattern);
    return copy;
  }

  startsWith(prefix: string): this {
    const copy = this.clone();
    copy._startsWith.push(prefix);
    return copy;
  }

  endsWith(suffix: string): this {
    const copy = this.clone();
    copy._endsWith.push(suffix);
    return copy;
  }

  includes(substring: string): this {
    const copy = this.clone();
    copy._includes.push(substring);
    return copy;
  }

  trim(): this {
    const copy = this.clone();
    copy._trim = true;
    return copy;
  }

  toLowerCase(): this {
    const copy = this.clone();
    copy._toLowerCase = true;
    return copy;
  }

  toUpperCase(): this {
    const copy = this.clone();
    copy._toUpperCase = true;
    return copy;
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
      value = this.defaultValue();
    }

    // Reject boolean values explicitly
    if (typeof value === 'boolean') {
      throw new Error(`Expected number, got ${typeof value}`);
    }

    // [F009] Number() alone accepts null, '', '  ', [] and [5] as 0 / 5.
    if (typeof value !== 'number' && (typeof value !== 'string' || value.trim() === '')) {
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
    if (this._multipleOf !== undefined && !isMultipleOf(num, this._multipleOf)) {
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
    const copy = this.clone();
    copy._min = value;
    return copy;
  }

  max(value: number): this {
    const copy = this.clone();
    copy._max = value;
    return copy;
  }

  int(): this {
    const copy = this.clone();
    copy._int = true;
    return copy;
  }

  positive(): this {
    const copy = this.clone();
    copy._positive = true;
    return copy;
  }

  negative(): this {
    const copy = this.clone();
    copy._negative = true;
    return copy;
  }

  nonpositive(): this {
    const copy = this.clone();
    copy._nonpositive = true;
    return copy;
  }

  nonnegative(): this {
    const copy = this.clone();
    copy._nonnegative = true;
    return copy;
  }

  multipleOf(value: number): this {
    const copy = this.clone();
    copy._multipleOf = value;
    return copy;
  }

  finite(): this {
    const copy = this.clone();
    copy._finite = true;
    return copy;
  }

  safe(): this {
    const copy = this.clone();
    copy._safe = true;
    return copy;
  }
}

class BooleanSchemaImpl extends BaseSchemaImpl<boolean> implements BooleanSchema {
  type = 'boolean' as const;

  parse(value: unknown): boolean {
    if (value === undefined && this._default !== undefined) {
      value = this.defaultValue();
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
      value = this.defaultValue();
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
    const copy = this.clone();
    copy._min = date;
    return copy;
  }

  max(date: Date): this {
    const copy = this.clone();
    copy._max = date;
    return copy;
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
      value = this.defaultValue();
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
    const copy = this.clone();
    copy._min = length;
    return copy;
  }

  max(length: number): this {
    const copy = this.clone();
    copy._max = length;
    return copy;
  }

  length(length: number): this {
    const copy = this.clone();
    copy._length = length;
    return copy;
  }

  nonempty(): this {
    const copy = this.clone();
    copy._nonempty = true;
    return copy;
  }
}

type ObjectPolicySource = ObjectSchemaImpl<Record<string, unknown>>;

class ObjectSchemaImpl<T extends Record<string, unknown>> extends BaseSchemaImpl<T> implements ObjectSchema<T> {
  type = 'object' as const;
  private _shape?: Record<string, BaseSchema<unknown>>;
  private _strict = false;
  private _passthrough = false;
  // private _strip = false; // unused variable
  private _catchall?: BaseSchema<unknown>;

  parse(value: unknown): T {
    if (value === undefined && this._default !== undefined) {
      value = this.defaultValue();
    }

    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new Error(`Expected object, got ${typeof value}`);
    }

    const result: Record<string, unknown> = {};
    const input = value as Record<string, unknown>;

    if (this._shape) {
      for (const [key, schema] of Object.entries(this._shape)) {
        try {
          // [F011] Object.prototype members (constructor, toString, ...) are not input.
          result[key] = schema.parse(
            hasOwn(input, key) || !(key in Object.prototype) ? input[key] : undefined
          );
        } catch (error) {
          throw new Error(`Invalid value for key "${key}": ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      for (const key of Object.keys(input)) {
        if (!hasOwn(this._shape, key)) {
          if (this._strict) {
            throw new Error(`Unknown key "${key}"`);
          } else if (this._passthrough) {
            setOwn(result, key, input[key]);
          } else if (this._catchall) {
            try {
              setOwn(result, key, this._catchall.parse(input[key]));
            } catch (error) {
              throw new Error(`Invalid value for key "${key}": ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }
      }
    } else {
      for (const key of Reflect.ownKeys(input)) {
        if (Object.prototype.propertyIsEnumerable.call(input, key)) {
          setOwn(result, key as string, input[key as string]);
        }
      }
    }

    this.applyRefinements(result as T);
    return this.applyTransforms(result as T);
  }

  // [F030] Derived schemas keep the unknown-key policy (strict / passthrough / catchall) of their source.
  private derive<U extends Record<string, unknown>>(
    shape: Record<string, BaseSchema<unknown>>,
    policy: ObjectPolicySource = this as unknown as ObjectPolicySource
  ): ObjectSchemaImpl<U> {
    const schema = new ObjectSchemaImpl<U>();
    schema._shape = shape;
    schema._strict = policy._strict;
    schema._passthrough = policy._passthrough;
    schema._catchall = policy._catchall;
    return schema;
  }

  shape<S extends Record<string, SchemaType>>(shape: S): ObjectSchema<{ [K in keyof S]: S[K] extends BaseSchema<infer U> ? U : never }> {
    const copy = this.clone();
    copy._shape = shape as any;
    return copy as any;
  }

  strict(): this {
    const copy = this.clone();
    copy._strict = true;
    copy._passthrough = false;
    return copy;
  }

  passthrough(): this {
    const copy = this.clone();
    copy._passthrough = true;
    copy._strict = false;
    return copy;
  }

  strip(): this {
    const copy = this.clone();
    // [F049] Unknown keys are dropped: leave strict / passthrough / catchall mode.
    copy._strict = false;
    copy._passthrough = false;
    copy._catchall = undefined;
    return copy;
  }

  catchall(schema: SchemaType): this {
    const copy = this.clone();
    copy._catchall = schema as BaseSchema<unknown>;
    return copy;
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

    return this.derive<Pick<T, K>>(newShape);
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

    return this.derive<Omit<T, K>>(newShape);
  }

  extend<S extends Record<string, SchemaType>>(extension: S): ObjectSchema<T & { [K in keyof S]: S[K] extends BaseSchema<infer U> ? U : never }> {
    const newShape = { ...(this._shape || {}), ...extension };
    return this.derive<T & { [K in keyof S]: S[K] extends BaseSchema<infer U> ? U : never }>(
      newShape as Record<string, BaseSchema<unknown>>
    );
  }

  merge<S extends Record<string, unknown>>(other: ObjectSchema<S>): ObjectSchema<T & S> {
    const otherImpl = other as ObjectSchemaImpl<S>;
    const newShape = { ...(this._shape || {}), ...(otherImpl._shape || {}) };
    return this.derive<T & S>(newShape, otherImpl as unknown as ObjectPolicySource);
  }

  partial(): ObjectSchema<Partial<T>> {
    if (!this._shape) {
      return this as any;
    }

    const newShape: Record<string, BaseSchema<unknown>> = {};
    for (const [key, value] of Object.entries(this._shape)) {
      newShape[key] = value.optional();
    }

    return this.derive<Partial<T>>(newShape);
  }

  deepPartial(): ObjectSchema<DeepPartial<T>> {
    // [F049] Nested object schemas become partial too.
    if (!this._shape) {
      return this as any;
    }

    const newShape: Record<string, BaseSchema<unknown>> = {};
    for (const [key, value] of Object.entries(this._shape)) {
      const inner =
        value instanceof ObjectSchemaImpl ? (value.deepPartial() as BaseSchema<unknown>) : value;
      newShape[key] = inner.optional();
    }

    return this.derive<DeepPartial<T>>(newShape);
  }

  required(): ObjectSchema<Required<T>> {
    // [F049] Unwrap optional() so every field must be present again.
    if (!this._shape) {
      return this as any;
    }

    const newShape: Record<string, BaseSchema<unknown>> = {};
    for (const [key, value] of Object.entries(this._shape)) {
      newShape[key] = value instanceof OptionalSchemaImpl ? value.innerType : value;
    }

    return this.derive<Required<T>>(newShape);
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
      value = this.defaultValue();
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
      value = this.defaultValue();
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
    // [F051] A default set on the optional wrapper itself replaces a missing value.
    if (value === undefined && this._default !== undefined) {
      value = this.defaultValue();
    }

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
    // [F051] A default set on the nullable wrapper itself replaces a missing value.
    if (value === undefined && this._default !== undefined) {
      value = this.defaultValue();
    }

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
        // [F052] The primitive schemas honour default / refine / transform like every other schema.
        if (input === undefined && this._default !== undefined) {
          input = this.defaultValue();
        }
        if (input !== value) {
          throw new Error(`Expected ${value}, got ${input}`);
        }
        this.applyRefinements(value);
        return this.applyTransforms(value);
      }
    })();
  },
  any: (): BaseSchema<any> => {
    return new (class extends BaseSchemaImpl<any> {
      type = 'any' as const;
      parse(value: unknown): any {
        if (value === undefined && this._default !== undefined) {
          value = this.defaultValue();
        }
        this.applyRefinements(value);
        return this.applyTransforms(value);
      }
    })();
  },
  unknown: (): BaseSchema<unknown> => {
    return new (class extends BaseSchemaImpl<unknown> {
      type = 'unknown' as const;
      parse(value: unknown): unknown {
        if (value === undefined && this._default !== undefined) {
          value = this.defaultValue();
        }
        this.applyRefinements(value);
        return this.applyTransforms(value);
      }
    })();
  },
  null: (): BaseSchema<null> => {
    return new (class extends BaseSchemaImpl<null> {
      type = 'null' as const;
      parse(value: unknown): null {
        if (value === undefined && this._default !== undefined) {
          value = this.defaultValue();
        }
        if (value !== null) {
          throw new Error(`Expected null, got ${typeof value}`);
        }
        this.applyRefinements(null);
        return this.applyTransforms(null);
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
        this.applyRefinements(undefined);
        return this.applyTransforms(undefined);
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
        this.applyRefinements(undefined);
        return this.applyTransforms(undefined);
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