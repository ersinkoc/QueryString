import { SecurityOptions, ParsedQuery } from './types';
import { getDepth, hasOwn } from './utils/object';
import { parse } from './parser';

const XSS_PATTERNS = [
  /<script[^>]*>.*?<\/script>/gi,
  /<iframe[^>]*>.*?<\/iframe>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<embed[^>]*>/gi,
  /<object[^>]*>/gi,
  /<link[^>]*>/gi,
  /<style[^>]*>.*?<\/style>/gi,
  /vbscript:/gi,
  /data:[^,]*,/gi,
];

const SQL_INJECTION_PATTERNS = [
  /\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b/gi,
  /(-{2}|\/\*|\*\/)/g,
  /[';]/g, // Remove quotes and semicolons
];

export function sanitizeInput(input: string, options: { aggressive?: boolean } = {}): string {
  if (!input || typeof input !== 'string') {
    return input;
  }

  let sanitized = input;
  let previous: string;

  // [F004] Repeat until stable: one pass lets 'javajavascript:script:' re-form the pattern.
  do {
    previous = sanitized;

    // Extract content from script tags
    sanitized = sanitized.replace(/<script[^>]*>(.*?)<\/script>/gi, '$1');
  
    // Remove other dangerous tags completely
    sanitized = sanitized.replace(/<iframe[^>]*>.*?<\/iframe>/gi, '');
    sanitized = sanitized.replace(/<embed[^>]*>/gi, '');
    sanitized = sanitized.replace(/<object[^>]*>/gi, '');
    sanitized = sanitized.replace(/<link[^>]*>/gi, '');
    sanitized = sanitized.replace(/<style[^>]*>.*?<\/style>/gi, '');
  
    // Remove javascript: and vbscript: prefixes
    sanitized = sanitized.replace(/javascript:/gi, '');
    sanitized = sanitized.replace(/vbscript:/gi, '');
    sanitized = sanitized.replace(/data:text\/html/gi, '');
  
    // Remove event handlers and their values completely
    sanitized = sanitized.replace(/on\w+\s*=\s*[^>\s]*/gi, '');

    if (options.aggressive) {
      for (const pattern of SQL_INJECTION_PATTERNS) {
        sanitized = sanitized.replace(pattern, '');
      }
    }
  } while (sanitized !== previous);

  sanitized = sanitized
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');

  return sanitized;
}

export function validateSecurity(
  obj: ParsedQuery,
  options: SecurityOptions = {}
): { valid: boolean; errors: string[] } {
  const {
    maxKeys = 1000,
    maxDepth = 10,
    allowPrototypes = false,
    sanitize = true,
  } = options;

  const errors: string[] = [];

  const keyCount = countKeys(obj);
  if (keyCount > maxKeys) {
    errors.push(`Too many keys: ${keyCount} (max: ${maxKeys})`);
  }

  const depth = getDepth(obj);
  if (depth > maxDepth) {
    errors.push(`Object too deep: ${depth} levels (max: ${maxDepth})`);
  }

  if (!allowPrototypes && hasPrototypePollution(obj)) {
    errors.push('Prototype pollution detected');
  }

  if (sanitize) {
    const xssVulnerabilities = detectXSS(obj);
    if (xssVulnerabilities.length > 0) {
      errors.push(`XSS vulnerabilities detected in keys: ${xssVulnerabilities.join(', ')}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function countKeys(obj: unknown, count = 0): number {
  if (!obj || typeof obj !== 'object') {
    return count;
  }

  if (Array.isArray(obj)) {
    for (const item of obj) {
      count = countKeys(item, count);
    }
  } else {
    for (const key in obj) {
      if (hasOwn(obj, key)) {
        count++;
        count = countKeys((obj as Record<string, unknown>)[key], count);
      }
    }
  }

  return count;
}

export function hasPrototypePollution(obj: unknown): boolean {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const dangerousKeys = ['__proto__', 'constructor', 'prototype'];

  if (Array.isArray(obj)) {
    for (const item of obj) {
      if (hasPrototypePollution(item)) {
        return true;
      }
    }
  } else {
    // Check for prototype pollution by looking for dangerous properties in prototype chain
    const proto = Object.getPrototypeOf(obj);
    if (proto && proto !== Object.prototype) {
      // If the prototype has been modified, check for dangerous properties
      const protoProps = Object.getOwnPropertyNames(proto);
      for (const prop of protoProps) {
        // [F032] Inspect data properties only; reading an accessor would execute it (and throws for Map/Set).
        const descriptor = Object.getOwnPropertyDescriptor(proto, prop);
        if (
          prop !== 'constructor' &&
          descriptor &&
          'value' in descriptor &&
          typeof descriptor.value !== 'function'
        ) {
          return true; // Non-constructor property in prototype indicates pollution
        }
      }
    }
    
    // Check own properties for dangerous keys (including non-enumerable ones)
    const allKeys = Object.getOwnPropertyNames(obj);
    for (const key of allKeys) {
      if (dangerousKeys.includes(key)) {
        return true;
      }
      if (hasPrototypePollution((obj as Record<string, unknown>)[key])) {
        return true;
      }
    }
    
    // Also check enumerable properties
    for (const key in obj) {
      if (hasOwn(obj, key)) {
        if (dangerousKeys.includes(key)) {
          return true;
        }
        if (hasPrototypePollution((obj as Record<string, unknown>)[key])) {
          return true;
        }
      }
    }
  }

  return false;
}

export function detectXSS(obj: unknown, path = ''): string[] {
  const vulnerabilities: string[] = [];

  if (!obj || typeof obj !== 'object') {
    if (typeof obj === 'string' && containsXSS(obj)) {
      vulnerabilities.push(path);
    }
    return vulnerabilities;
  }

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      vulnerabilities.push(...detectXSS(obj[i], `${path}[${i}]`));
    }
  } else {
    for (const key in obj) {
      if (hasOwn(obj, key)) {
        const newPath = path ? `${path}.${key}` : key;
        if (containsXSS(key)) {
          vulnerabilities.push(`${newPath} (key)`);
        }
        vulnerabilities.push(...detectXSS((obj as Record<string, unknown>)[key], newPath));
      }
    }
  }

  return vulnerabilities;
}

function containsXSS(str: string): boolean {
  if (typeof str !== 'string') {
    return false;
  }

  for (const pattern of XSS_PATTERNS) {
    // Reset regex state to avoid global flag issues
    pattern.lastIndex = 0;
    if (pattern.test(str)) {
      return true;
    }
  }

  return false;
}

export function secureStringify(obj: unknown, options: SecurityOptions = {}): string {
  let processedObj = obj;
  
  if (options.sanitize) {
    // First sanitize the object
    processedObj = sanitizeObjectData(obj);
  }
  
  // Then validate the processed object
  const validation = validateSecurity(processedObj as ParsedQuery, options);
  
  if (!validation.valid) {
    throw new Error(`Security validation failed: ${validation.errors.join(', ')}`);
  }

  return JSON.stringify(processedObj);
}

function sanitizeObjectData(obj: unknown): unknown {
  if (!obj || typeof obj !== 'object') {
    return typeof obj === 'string' ? sanitizeInput(obj) : String(obj);
  }

  // [F031] Dates are data, not containers; rebuilding them from their keys would yield {}.
  if (obj instanceof Date) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObjectData(item));
  }

  const sanitized: Record<string, unknown> = {};
  for (const key in obj) {
    if (hasOwn(obj, key)) {
      const sanitizedKey = sanitizeInput(key);
      // [F005] Plain assignment of '__proto__' would invoke the prototype setter; drop the key.
      if (sanitizedKey === '__proto__') {
        continue;
      }
      sanitized[sanitizedKey] = sanitizeObjectData((obj as Record<string, unknown>)[key]);
    }
  }

  return sanitized;
}


type SecureParser = (input: string, options?: unknown) => ParsedQuery;
type BaseParser = (input: string, options?: never) => unknown;

export function createSecureParser(securityOptions?: SecurityOptions): SecureParser;
export function createSecureParser(
  baseParser: BaseParser,
  securityOptions?: SecurityOptions
): SecureParser;
export function createSecureParser(
  first: BaseParser | SecurityOptions = {},
  second: SecurityOptions = {}
): SecureParser {
  // [F042] The documented call is createSecureParser(options): an options object uses the library's own parse().
  const baseParser: BaseParser = typeof first === 'function' ? first : parse;
  const securityOptions: SecurityOptions = typeof first === 'function' ? second : first;

  return function secureParser(input: string, options?: unknown): ParsedQuery {
    let result = baseParser(input, options as never) as ParsedQuery;
    
    if (securityOptions.sanitize) {
      result = sanitizeObjectData(result) as ParsedQuery;
    }
    
    const validation = validateSecurity(result, securityOptions);

    if (!validation.valid) {
      throw new Error(`Security validation failed: ${validation.errors.join(', ')}`);
    }

    return result;
  };
}