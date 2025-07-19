import { BaseSchema, SchemaType } from './index';

export type Infer<T extends BaseSchema<any>> = T extends BaseSchema<infer U> ? U : never;

export type InferObject<T extends Record<string, SchemaType>> = {
  [K in keyof T]: T[K] extends BaseSchema<infer U> ? U : never;
};

export type SchemaShape = Record<string, SchemaType>;

export interface ValidationError {
  path: string;
  message: string;
  value?: unknown;
}

export interface ValidationContext {
  path: string[];
  errors: ValidationError[];
}

export type CoerceType = 'string' | 'number' | 'boolean' | 'date';

export interface CoercionOptions {
  types: CoerceType[];
  strict?: boolean;
}

export interface TransformFunction<TInput, TOutput> {
  (value: TInput): TOutput;
}

export interface RefinementFunction<T> {
  (value: T): boolean;
}

export interface DefaultValueFunction<T> {
  (): T;
}

export type DefaultValue<T> = T | DefaultValueFunction<T>;

export interface SchemaOptions {
  description?: string;
  examples?: unknown[];
  deprecated?: boolean;
  meta?: Record<string, unknown>;
}