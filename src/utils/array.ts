import { ArrayFormat, QueryValue } from '../types';

export function joinArrayFormat(
  key: string,
  values: unknown[],
  format: ArrayFormat,
  separator = ','
): string[] {
  if (!Array.isArray(values) || values.length === 0) {
    return [];
  }

  switch (format) {
    case 'brackets':
      return values.map((value) => `${key}[]=${value}`);
    
    case 'indices':
      return values.map((value, index) => `${key}[${index}]=${value}`);
    
    case 'repeat':
      return values.map((value) => `${key}=${value}`);
    
    case 'comma':
      return [`${key}=${values.join(',')}`];
    
    case 'separator':
      return [`${key}=${values.join(separator)}`];
    
    case 'json':
      return [`${key}=${JSON.stringify(values)}`];
    
    case 'bracket-separator':
      return [`${key}[]=${values.join(separator)}`];
    
    default:
      return values.map((value) => `${key}=${value}`);
  }
}

export function parseArrayFormat(
  _key: string,
  value: string | string[],
  format: ArrayFormat,
  separator = ','
): QueryValue {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value !== 'string') {
    return value;
  }

  switch (format) {
    case 'comma':
      if (value.includes(',')) {
        return value.split(',').map((v) => v.trim());
      }
      return value;
    
    case 'separator':
    case 'bracket-separator':
      if (value.includes(separator)) {
        return value.split(separator).map((v) => v.trim());
      }
      return value;
    
    case 'json':
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : value;
      } catch {
        return value;
      }
    
    default:
      return value;
  }
}

export function isArrayKey(key: string, format: ArrayFormat): boolean {
  switch (format) {
    case 'brackets':
      return key.endsWith('[]');
    
    case 'indices':
      return /\[\d+\]$/.test(key);
    
    default:
      return false;
  }
}

export function normalizeArrayKey(key: string, format: ArrayFormat): string {
  switch (format) {
    case 'brackets':
      return key.replace(/\[\]$/, '');
    
    case 'indices':
      return key.replace(/\[\d+\]$/, '');
    
    default:
      return key;
  }
}

export function combineArrayValues(existing: QueryValue, newValue: QueryValue): QueryValue {
  if (existing === undefined) {
    return newValue;
  }

  if (Array.isArray(existing)) {
    if (Array.isArray(newValue)) {
      return existing.concat(newValue);
    }
    return existing.concat([newValue as any]);
  }

  if (Array.isArray(newValue)) {
    return [existing as any].concat(newValue as any[]);
  }

  return [existing as any, newValue as any];
}

export function ensureArray<T>(value: T | T[]): T[] {
  return Array.isArray(value) ? value : [value];
}

export function flattenArray(arr: unknown[]): unknown[] {
  const result: unknown[] = [];
  
  for (const item of arr) {
    if (Array.isArray(item)) {
      result.push(...flattenArray(item));
    } else {
      result.push(item);
    }
  }
  
  return result;
}

export function isSparseArray(arr: unknown[]): boolean {
  for (let i = 0; i < arr.length; i++) {
    if (!(i in arr)) {
      return true;
    }
  }
  return false;
}

export function compactArray<T>(arr: (T | undefined | null)[]): T[] {
  return arr.filter((item): item is T => item !== undefined && item !== null);
}