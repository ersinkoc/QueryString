import { QueryBuilderOptions, ParsedQuery, StringifyOptions, QueryValue, Primitive } from './types';
import { stringify, stringifyUrl } from './stringifier';
import { parse, parseUrl } from './parser';
import { isObject, merge } from './utils/object';

export class QueryBuilder {
  private query: ParsedQuery = {};
  private options: QueryBuilderOptions;

  constructor(options: QueryBuilderOptions = {}) {
    this.options = options;
    if (options.baseUrl) {
      const parsed = parseUrl(options.baseUrl);
      this.query = parsed.query;
    }
  }

  static from(input: string | ParsedQuery | QueryBuilder, options?: QueryBuilderOptions): QueryBuilder {
    const builder = new QueryBuilder(options);
    
    if (typeof input === 'string') {
      builder.query = parse(input, options);
    } else if (input instanceof QueryBuilder) {
      builder.query = { ...input.query };
      builder.options = { ...input.options, ...options };
    } else if (isObject(input)) {
      builder.query = { ...input };
    }
    
    return builder;
  }

  add(key: string, value: unknown): this {
    this.query[key] = value as QueryValue;
    return this;
  }

  addMultiple(obj: Record<string, unknown>): this {
    Object.assign(this.query, obj);
    return this;
  }

  addArray(key: string, values: unknown[]): this {
    if (!Array.isArray(values)) {
      throw new TypeError('Values must be an array');
    }
    this.query[key] = values as Primitive[];
    return this;
  }

  addObject(key: string, obj: Record<string, unknown>): this {
    if (!isObject(obj)) {
      throw new TypeError('Value must be an object');
    }
    this.query[key] = obj as { [key: string]: QueryValue };
    return this;
  }

  append(key: string, value: unknown): this {
    const existing = this.query[key];
    
    if (existing === undefined) {
      this.query[key] = value as QueryValue;
    } else if (Array.isArray(existing)) {
      existing.push(value as Primitive);
    } else {
      this.query[key] = [existing as Primitive, value as Primitive];
    }
    
    return this;
  }

  set(key: string, value: unknown): this {
    return this.add(key, value);
  }

  get(key: string): unknown {
    return this.query[key];
  }

  has(key: string): boolean {
    return key in this.query;
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

  forEach(callback: (value: unknown, key: string, builder: QueryBuilder) => void): this {
    for (const [key, value] of this.entries()) {
      callback(value, key, this);
    }
    return this;
  }

  map<T>(callback: (value: unknown, key: string, builder: QueryBuilder) => T): T[] {
    const results: T[] = [];
    this.forEach((value, key) => {
      results.push(callback(value, key, this));
    });
    return results;
  }

  filter(predicate: (value: unknown, key: string, builder: QueryBuilder) => boolean): QueryBuilder {
    const filtered = new QueryBuilder(this.options);
    
    this.forEach((value, key) => {
      if (predicate(value, key, this)) {
        filtered.add(key, value);
      }
    });
    
    return filtered;
  }

  merge(other: string | ParsedQuery | QueryBuilder): this {
    let otherQuery: ParsedQuery;
    
    if (typeof other === 'string') {
      otherQuery = parse(other, this.options);
    } else if (other instanceof QueryBuilder) {
      otherQuery = other.query;
    } else {
      otherQuery = other;
    }
    
    this.query = merge(this.query, otherQuery) as ParsedQuery;
    return this;
  }

  clone(): QueryBuilder {
    const cloned = new QueryBuilder(this.options);
    cloned.query = JSON.parse(JSON.stringify(this.query));
    return cloned;
  }

  isEmpty(): boolean {
    return Object.keys(this.query).length === 0;
  }

  size(): number {
    return Object.keys(this.query).length;
  }

  toObject(): ParsedQuery {
    return { ...this.query };
  }

  toString(options?: StringifyOptions): string {
    return stringify(this.query, { ...this.options, ...options });
  }

  toUrl(url?: string, options?: StringifyOptions): string {
    const baseUrl = url || this.options.baseUrl;
    
    if (!baseUrl) {
      throw new Error('No base URL provided');
    }
    
    return stringifyUrl(baseUrl, this.query, { ...this.options, ...options });
  }

  build(options?: StringifyOptions): string {
    return this.toString(options);
  }

  buildUrl(url?: string, options?: StringifyOptions): string {
    return this.toUrl(url, options);
  }

  pick(...keys: string[]): QueryBuilder {
    const picked = new QueryBuilder(this.options);
    
    for (const key of keys) {
      if (this.has(key)) {
        picked.add(key, this.get(key));
      }
    }
    
    return picked;
  }

  omit(...keys: string[]): QueryBuilder {
    const omitted = new QueryBuilder(this.options);
    const keySet = new Set(keys);
    
    this.forEach((value, key) => {
      if (!keySet.has(key)) {
        omitted.add(key, value);
      }
    });
    
    return omitted;
  }

  transform(transformer: (query: ParsedQuery) => ParsedQuery): this {
    this.query = transformer(this.query);
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

  when(condition: boolean | ((builder: QueryBuilder) => boolean), callback: (builder: QueryBuilder) => void): this {
    const shouldExecute = typeof condition === 'function' ? condition(this) : condition;
    
    if (shouldExecute) {
      callback(this);
    }
    
    return this;
  }

  unless(condition: boolean | ((builder: QueryBuilder) => boolean), callback: (builder: QueryBuilder) => void): this {
    return this.when(
      typeof condition === 'function' ? (builder) => !condition(builder) : !condition,
      callback
    );
  }

  tap(callback: (builder: QueryBuilder) => void): this {
    callback(this);
    return this;
  }

  static parse(input: string, options?: QueryBuilderOptions): QueryBuilder {
    return QueryBuilder.from(input, options);
  }

  static create(query?: ParsedQuery, options?: QueryBuilderOptions): QueryBuilder {
    const builder = new QueryBuilder(options);
    if (query) {
      builder.query = { ...query };
    }
    return builder;
  }
}