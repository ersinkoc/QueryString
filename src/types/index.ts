export type Primitive = string | number | boolean | null | undefined;
export type QueryValue = Primitive | Primitive[] | { [key: string]: QueryValue };
export type ParsedQuery = Record<string, QueryValue>;

export interface ParseOptions {
  delimiter?: string;
  depth?: number;
  arrayFormat?: ArrayFormat;
  arrayFormatSeparator?: string;
  decode?: boolean;
  decoder?: (str: string, defaultDecoder: (str: string) => string) => string;
  charset?: 'utf-8' | 'iso-8859-1';
  charsetSentinel?: boolean;
  interpretNumericEntities?: boolean;
  parameterLimit?: number;
  parseArrays?: boolean;
  allowDots?: boolean;
  plainObjects?: boolean;
  allowPrototypes?: boolean;
  allowSparse?: boolean;
  strictNullHandling?: boolean;
  comma?: boolean;
  commaRoundTrip?: boolean;
  ignoreQueryPrefix?: boolean;
  duplicates?: 'combine' | 'first' | 'last';
  parseNumbers?: boolean;
  parseBooleans?: boolean;
  parseDates?: boolean;
  typeCoercion?: boolean | TypeCoercionOptions;
}

export interface StringifyOptions {
  delimiter?: string;
  strictNullHandling?: boolean;
  skipNulls?: boolean;
  encode?: boolean;
  encoder?: (str: string, defaultEncoder: (str: string) => string, charset: string) => string;
  filter?: Array<string | number> | ((prefix: string, value: unknown) => unknown);
  arrayFormat?: ArrayFormat;
  arrayFormatSeparator?: string;
  indices?: boolean;
  sort?: ((a: string, b: string) => number) | boolean;
  serializeDate?: (date: Date) => string;
  format?: 'RFC1738' | 'RFC3986';
  encodeValuesOnly?: boolean;
  addQueryPrefix?: boolean;
  allowDots?: boolean;
  charset?: 'utf-8' | 'iso-8859-1';
  charsetSentinel?: boolean;
  commaRoundTrip?: boolean;
  comma?: boolean;
}

export type ArrayFormat = 
  | 'brackets'
  | 'indices' 
  | 'repeat'
  | 'comma'
  | 'separator'
  | 'json'
  | 'bracket-separator';

export interface TypeCoercionOptions {
  numbers?: boolean;
  booleans?: boolean;
  dates?: boolean;
  arrays?: boolean;
  objects?: boolean;
}

export interface SecurityOptions {
  maxKeys?: number;
  maxDepth?: number;
  allowPrototypes?: boolean;
  sanitize?: boolean;
}

export interface QueryStringPlugin {
  name: string;
  beforeParse?: (input: string, options: ParseOptions) => string;
  afterParse?: (result: ParsedQuery, options: ParseOptions) => ParsedQuery;
  beforeStringify?: (obj: ParsedQuery, options: StringifyOptions) => ParsedQuery;
  afterStringify?: (result: string, options: StringifyOptions) => string;
}

export interface QueryBuilderOptions extends StringifyOptions {
  baseUrl?: string;
}

export interface ParsedUrl {
  url: string;
  query: ParsedQuery;
}

export interface SchemaValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: Array<{
    path: string;
    message: string;
    value?: unknown;
  }>;
}

export type SchemaType = 
  | StringSchema
  | NumberSchema
  | BooleanSchema
  | DateSchema
  | ArraySchema<any>
  | ObjectSchema<any>
  | EnumSchema<any>
  | UnionSchema<any>
  | OptionalSchema<any>
  | NullableSchema<any>;

export interface BaseSchema<T = unknown> {
  type: string;
  parse(value: unknown): T;
  safeParse(value: unknown): SchemaValidationResult<T>;
  optional(): OptionalSchema<T>;
  nullable(): NullableSchema<T>;
  default(value: T): this;
  transform<U>(fn: (value: T) => U): BaseSchema<U>;
  refine(fn: (value: T) => boolean, message?: string): this;
}

export interface StringSchema extends BaseSchema<string> {
  type: 'string';
  min(length: number): this;
  max(length: number): this;
  length(length: number): this;
  email(): this;
  url(): this;
  uuid(): this;
  regex(pattern: RegExp): this;
  startsWith(prefix: string): this;
  endsWith(suffix: string): this;
  includes(substring: string): this;
  trim(): this;
  toLowerCase(): this;
  toUpperCase(): this;
}

export interface NumberSchema extends BaseSchema<number> {
  type: 'number';
  min(value: number): this;
  max(value: number): this;
  int(): this;
  positive(): this;
  negative(): this;
  nonpositive(): this;
  nonnegative(): this;
  multipleOf(value: number): this;
  finite(): this;
  safe(): this;
}

export interface BooleanSchema extends BaseSchema<boolean> {
  type: 'boolean';
}

export interface DateSchema extends BaseSchema<Date> {
  type: 'date';
  min(date: Date): this;
  max(date: Date): this;
}

export interface ArraySchema<T = unknown> extends BaseSchema<T[]> {
  type: 'array';
  min(length: number): this;
  max(length: number): this;
  length(length: number): this;
  nonempty(): this;
}

export interface ObjectSchema<T = Record<string, unknown>> extends BaseSchema<T> {
  type: 'object';
  shape<S extends Record<string, SchemaType>>(shape: S): ObjectSchema<{ [K in keyof S]: S[K] extends BaseSchema<infer U> ? U : never }>;
  strict(): this;
  passthrough(): this;
  strip(): this;
  catchall(schema: SchemaType): this;
  pick<K extends keyof T>(keys: K[]): ObjectSchema<Pick<T, K>>;
  omit<K extends keyof T>(keys: K[]): ObjectSchema<Omit<T, K>>;
  extend<S extends Record<string, SchemaType>>(schema: S): ObjectSchema<T & { [K in keyof S]: S[K] extends BaseSchema<infer U> ? U : never }>;
  merge<S extends Record<string, unknown>>(schema: ObjectSchema<S>): ObjectSchema<T & S>;
  partial(): ObjectSchema<Partial<T>>;
  deepPartial(): ObjectSchema<DeepPartial<T>>;
  required(): ObjectSchema<Required<T>>;
}

export interface EnumSchema<T extends readonly [string, ...string[]]> extends BaseSchema<T[number]> {
  type: 'enum';
  options: T;
}

export interface UnionSchema<T extends readonly SchemaType[]> extends BaseSchema<T[number] extends BaseSchema<infer U> ? U : never> {
  type: 'union';
  options: T;
}

export interface OptionalSchema<T> extends BaseSchema<T | undefined> {
  type: 'optional';
  innerType: BaseSchema<T>;
}

export interface NullableSchema<T> extends BaseSchema<T | null> {
  type: 'nullable';
  innerType: BaseSchema<T>;
}

type DeepPartial<T> = T extends object ? {
  [P in keyof T]?: DeepPartial<T[P]>;
} : T;