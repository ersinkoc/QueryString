import { QueryValue } from '../types';

export function isObject(obj: unknown): obj is Record<string, unknown> {
  return obj !== null && typeof obj === 'object' && !Array.isArray(obj);
}

export function hasOwn(obj: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

export function merge(target: Record<string, QueryValue>, source: Record<string, QueryValue>, options: { allowPrototypes?: boolean } = {}): Record<string, QueryValue> {
  if (!source) {
    return target;
  }

  if (!isObject(source)) {
    if (Array.isArray(target)) {
      target.push(source);
    } else if (isObject(target)) {
      if (options.allowPrototypes || hasOwn(source, 'constructor') === false) {
        target[Object.keys(source).length] = source;
      }
    } else {
      return [target, source] as unknown as Record<string, QueryValue>;
    }
    return target;
  }

  if (!isObject(target)) {
    return Object.assign({}, { 0: target }, source) as unknown as Record<string, QueryValue>;
  }

  const mergeTarget = { ...target };
  
  if (Array.isArray(source) && !Array.isArray(target)) {
    return source as unknown as Record<string, QueryValue>;
  }

  Object.keys(source).forEach((key) => {
    const value = source[key];

    if (hasOwn(mergeTarget, key)) {
      const targetValue = mergeTarget[key];
      if (Array.isArray(targetValue) && Array.isArray(value)) {
        mergeTarget[key] = targetValue.concat(value);
      } else if (isObject(targetValue) && isObject(value)) {
        mergeTarget[key] = merge(targetValue as Record<string, QueryValue>, value as Record<string, QueryValue>, options);
      } else {
        mergeTarget[key] = value;
      }
    } else {
      mergeTarget[key] = value;
    }
  });

  return mergeTarget;
}

export function assignSymbols(target: Record<string | symbol, unknown>, source: Record<string | symbol, unknown>): Record<string | symbol, unknown> {
  const symbols = Object.getOwnPropertySymbols(source);
  for (const symbol of symbols) {
    target[symbol] = source[symbol];
  }
  return target;
}

export function toPlainObject(obj: unknown): Record<string, unknown> {
  if (!isObject(obj)) {
    return {};
  }

  const plainObject: Record<string, unknown> = {};
  
  for (const key in obj) {
    if (hasOwn(obj, key)) {
      plainObject[key] = obj[key];
    }
  }

  return plainObject;
}

export function getDepth(obj: unknown, currentDepth = 0): number {
  if (!isObject(obj) && !Array.isArray(obj)) {
    return currentDepth;
  }

  let maxDepth = currentDepth;

  if (Array.isArray(obj)) {
    for (const item of obj) {
      const depth = getDepth(item, currentDepth + 1);
      maxDepth = Math.max(maxDepth, depth);
    }
  } else {
    for (const key in obj) {
      if (hasOwn(obj, key)) {
        const depth = getDepth((obj as Record<string, unknown>)[key], currentDepth + 1);
        maxDepth = Math.max(maxDepth, depth);
      }
    }
  }

  return maxDepth;
}

export function flattenObject(obj: Record<string, unknown>, prefix = '', allowDots = false): Record<string, unknown> {
  const flattened: Record<string, unknown> = {};

  for (const key in obj) {
    if (hasOwn(obj, key)) {
      const value = obj[key];
      const newKey = prefix ? (allowDots ? `${prefix}.${key}` : `${prefix}[${key}]`) : key;

      if (isObject(value)) {
        Object.assign(flattened, flattenObject(value as Record<string, unknown>, newKey, allowDots));
      } else if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
          const arrayKey = `${newKey}[${i}]`;
          if (isObject(value[i])) {
            Object.assign(flattened, flattenObject(value[i] as Record<string, unknown>, arrayKey, allowDots));
          } else {
            flattened[arrayKey] = value[i];
          }
        }
      } else {
        flattened[newKey] = value;
      }
    }
  }

  return flattened;
}

export function unflattenObject(obj: Record<string, unknown>, allowDots = false): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const key in obj) {
    if (hasOwn(obj, key)) {
      const keys = allowDots ? key.split('.') : key.split(/[[\]]+/).filter(Boolean);
      let current: Record<string, unknown> = result;

      for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i];
        const nextKey = keys[i + 1];
        const isArrayIndex = /^\d+$/.test(nextKey);

        if (!hasOwn(current, k)) {
          current[k] = isArrayIndex ? [] : {};
        }

        current = current[k] as Record<string, unknown>;
      }

      const lastKey = keys[keys.length - 1];
      current[lastKey] = obj[key];
    }
  }

  return result;
}