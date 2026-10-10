import { QueryBuilderOptions, ParsedQuery, StringifyOptions, QueryValue, Primitive } from './types';
import { stringify, stringifyUrl } from './stringifier';
import { parse, parseUrl } from './parser';
import { hasOwn, isObject, merge, setOwn, withOptions } from './utils/object';

// [F035] Faithful deep copy (JSON round trips turn Dates into strings and drop undefined / NaN).
function cloneValue(value: unknown, seen: WeakMap<object, unknown> = new WeakMap()): unknown {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (value instanceof Date) {
    return new Date(value.getTime());
  }
  if (seen.has(value)) {
    return seen.get(value);
  }
  if (Array.isArray(value)) {
    const copy: unknown[] = [];
    seen.set(value, copy);
    for (const item of value) {
      copy.push(cloneValue(item, seen));
    }
    return copy;
  }
  const copy: Record<string, unknown> =
    Object.getPrototypeOf(value) === null ? Object.create(null) : {};
  seen.set(value, copy);
  for (const key of Object.keys(value)) {
    setOwn(copy, key, cloneValue((value as Record<string, unknown>)[key], seen));
  }
  return copy;
}

// [F043] Shape is the documented `QueryBuilder<SearchParams>` type parameter; it types toObject() and derived builders.
export class QueryBuilder<Shape extends object = ParsedQuery> {
  private query: ParsedQuery = {};
  private options: QueryBuilderOptions;

  constructor(options: QueryBuilderOptions = {}) {
    this.options = options;
    if (options.baseUrl) {
      const parsed = parseUrl(options.baseUrl);
      this.query = parsed.query;
    }
  }

  static from(input: string | ParsedQuery | QueryBuilder<object>, options?: QueryBuilderOptions): QueryBuilder {
    const builder = new QueryBuilder(options);
    
    if (typeof input === 'string') {
      builder.query = { ...builder.query, ...parse(input, options) };
    } else if (input instanceof QueryBuilder) {
      builder.query = cloneValue(input.query) as ParsedQuery;
      builder.options = withOptions(input.options, options);
    } else if (isObject(input)) {
      builder.query = { ...builder.query, ...(cloneValue(input) as ParsedQuery) };
    }
    
    return builder;
  }

  // [F069] The builder owns its data: values handed in are copied, so later changes by the caller (or by a sibling builder) cannot leak in.
  add(key: string, value: unknown): this {
    setOwn(this.query, key, cloneValue(value) as QueryValue);
    return this;
  }

  addMultiple(obj: Record<string, unknown>): this {
    for (const key of Object.keys(obj)) {
      setOwn(this.query, key, cloneValue(obj[key]));
    }
    return this;
  }

  addArray(key: string, values: unknown[]): this {
    if (!Array.isArray(values)) {
      throw new TypeError('Values must be an array');
    }
    setOwn(this.query, key, cloneValue(values) as Primitive[]);
    return this;
  }

  addObject(key: string, obj: Record<string, unknown>): this {
    if (!isObject(obj)) {
      throw new TypeError('Value must be an object');
    }
    setOwn(this.query, key, cloneValue(obj) as { [key: string]: QueryValue });
    return this;
  }

  append(key: string, value: unknown): this {
    const existing = hasOwn(this.query, key) ? this.query[key] : undefined;
    const copied = cloneValue(value);
    
    if (existing === undefined) {
      setOwn(this.query, key, copied as QueryValue);
    } else if (Array.isArray(existing)) {
      // [F017] Copy instead of push: the array may be shared with the caller or another builder.
      setOwn(this.query, key, [...existing, copied as Primitive]);
    } else {
      setOwn(this.query, key, [existing as Primitive, copied as Primitive]);
    }
    
    return this;
  }

  set(key: string, value: unknown): this {
    return this.add(key, value);
  }

  get(key: string): unknown {
    return hasOwn(this.query, key) ? this.query[key] : undefined;
  }

  has(key: string): boolean {
    return hasOwn(this.query, key);
  }

  delete(key: string): this {
    delete this.query[key];
    return this;
  }

  clear(): this {
    this.query = {};
    return this;
  }

  keys(): string[] {
    return Object.keys(this.query);
  }

  values(): unknown[] {
    return Object.values(this.query);
  }

  entries(): Array<[string, unknown]> {
    return Object.entries(this.query);
  }

  forEach(callback: (value: unknown, key: string, builder: QueryBuilder<Shape>) => void): this {
    for (const [key, value] of this.entries()) {
      callback(value, key, this);
    }
    return this;
  }

  map<T>(callback: (value: unknown, key: string, builder: QueryBuilder<Shape>) => T): T[] {
    const results: T[] = [];
    this.forEach((value, key) => {
      results.push(callback(value, key, this));
    });
    return results;
  }

  filter(
    predicate: (value: unknown, key: string, builder: QueryBuilder<Shape>) => boolean
  ): QueryBuilder<Shape> {
    const filtered = this.emptyCopy();
    
    this.forEach((value, key) => {
      if (predicate(value, key, this)) {
        filtered.add(key, value);
      }
    });
    
    return filtered;
  }

  merge(other: string | ParsedQuery | QueryBuilder<object>): this {
    let otherQuery: ParsedQuery;
    
    if (typeof other === 'string') {
      otherQuery = parse(other, this.options);
    } else if (other instanceof QueryBuilder) {
      otherQuery = cloneValue(other.query) as ParsedQuery;
    } else {
      otherQuery = cloneValue(other) as ParsedQuery;
    }
    
    this.query = merge(this.query, otherQuery) as ParsedQuery;
    return this;
  }

  clone(): QueryBuilder<Shape> {
    const cloned = this.emptyCopy();
    cloned.query = cloneValue(this.query) as ParsedQuery;
    return cloned;
  }

  // [F033] The constructor seeds the query from options.baseUrl; derived builders must start empty.
  private emptyCopy(): QueryBuilder<Shape> {
    const copy = new QueryBuilder<Shape>(this.options);
    copy.query = {};
    return copy;
  }

  isEmpty(): boolean {
    return Object.keys(this.query).length === 0;
  }

  size(): number {
    return Object.keys(this.query).length;
  }

  toObject(): Shape {
    // [F069] A snapshot: editing the result must not edit the builder.
    return cloneValue(this.query) as unknown as Shape;
  }

  toString(options?: StringifyOptions): string {
    return stringify(this.query, withOptions(this.options, options));
  }

  toUrl(url?: string, options?: StringifyOptions): string {
    // [F016] options.baseUrl's own query string was already loaded into this.query by the constructor.
    const baseUrl = url || this.options.baseUrl?.split('?')[0];
    
    if (!baseUrl) {
      throw new Error('No base URL provided');
    }
    
    return stringifyUrl(baseUrl, this.query, withOptions(this.options, options));
  }

  build(options?: StringifyOptions): string {
    return this.toString(options);
  }

  buildUrl(url?: string, options?: StringifyOptions): string {
    return this.toUrl(url, options);
  }

  pick(...keys: string[]): QueryBuilder<Shape> {
    const picked = this.emptyCopy();
    
    for (const key of keys) {
      if (this.has(key)) {
        picked.add(key, this.get(key));
      }
    }
    
    return picked;
  }

  omit(...keys: string[]): QueryBuilder<Shape> {
    const omitted = this.emptyCopy();
    const keySet = new Set(keys);
    
    this.forEach((value, key) => {
      if (!keySet.has(key)) {
        omitted.add(key, value);
      }
    });
    
    return omitted;
  }

  transform(transformer: (query: ParsedQuery) => ParsedQuery): this {
    // [F073] Work on a snapshot and keep a snapshot of the result: no aliasing, no half-applied edits, no non-object query.
    const result = transformer(cloneValue(this.query) as ParsedQuery) as unknown;
    if (typeof result !== 'object' || result === null || Array.isArray(result)) {
      throw new TypeError('transform() must return a query object');
    }
    this.query = cloneValue(result) as ParsedQuery;
    return this;
  }

  validate(validator: (query: ParsedQuery) => boolean | string): this {
    const result = validator(this.query);
    
    if (result === false) {
      throw new Error('Query validation failed');
    } else if (typeof result === 'string') {
      throw new Error(`Query validation failed: ${result}`);
    }
    
    return this;
  }

  when(
    condition: boolean | ((builder: QueryBuilder<Shape>) => boolean),
    callback: (builder: QueryBuilder<Shape>) => void
  ): this {
    const shouldExecute = typeof condition === 'function' ? condition(this) : condition;
    
    if (shouldExecute) {
      callback(this);
    }
    
    return this;
  }

  unless(
    condition: boolean | ((builder: QueryBuilder<Shape>) => boolean),
    callback: (builder: QueryBuilder<Shape>) => void
  ): this {
    return this.when(
      typeof condition === 'function' ? (builder) => !condition(builder) : !condition,
      callback
    );
  }

  tap(callback: (builder: QueryBuilder<Shape>) => void): this {
    callback(this);
    return this;
  }

  static parse(input: string, options?: QueryBuilderOptions): QueryBuilder {
    return QueryBuilder.from(input, options);
  }

  static create(query?: ParsedQuery, options?: QueryBuilderOptions): QueryBuilder {
    const builder = new QueryBuilder(options);
    if (query) {
      builder.query = { ...builder.query, ...(cloneValue(query) as ParsedQuery) };
    }
    return builder;
  }
}