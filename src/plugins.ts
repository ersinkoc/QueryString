import { QueryStringPlugin, ParseOptions, StringifyOptions, ParsedQuery } from './types';
import { combineArrayValues } from './utils/array';
import { hasOwn } from './utils/object';

// [F012] Plain assignment of '__proto__' would replace the output object's prototype.
function setKey(target: Record<string, unknown>, key: string, value: unknown): void {
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

// [F014] btoa/atob are Latin-1 only; route text through its UTF-8 bytes.
function utf8ToBinary(text: string): string {
  const TextEncoderCtor = (
    globalThis as unknown as { TextEncoder?: new () => { encode(input: string): Uint8Array } }
  ).TextEncoder;
  if (typeof TextEncoderCtor !== 'function') {
    return text;
  }
  let binary = '';
  for (const byte of new TextEncoderCtor().encode(text)) {
    binary += String.fromCharCode(byte);
  }
  return binary;
}

function binaryToUtf8(binary: string): string {
  const TextDecoderCtor = (
    globalThis as unknown as {
      TextDecoder?: new (
        label: string,
        options: { fatal: boolean }
      ) => { decode(input: Uint8Array): string };
    }
  ).TextDecoder;
  if (typeof TextDecoderCtor !== 'function') {
    return binary;
  }
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoderCtor('utf-8', { fatal: true }).decode(bytes);
}

type QueryEntry = ParsedQuery[string];

// [F037] Keys that collide after lowercasing are combined like repeated keys instead of overwriting each other.
function setLowercased(target: Record<string, unknown>, key: string, value: unknown): void {
  const lower = key.toLowerCase();
  if (hasOwn(target, lower)) {
    setKey(target, lower, combineArrayValues(target[lower] as QueryEntry, value as QueryEntry));
  } else {
    setKey(target, lower, value);
  }
}

export class PluginManager {
  private plugins: Map<string, QueryStringPlugin> = new Map();

  register(plugin: QueryStringPlugin): this {
    if (!plugin.name) {
      throw new Error('Plugin must have a name');
    }
    
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin "${plugin.name}" is already registered`);
    }
    
    this.plugins.set(plugin.name, plugin);
    return this;
  }

  unregister(pluginName: string): boolean {
    return this.plugins.delete(pluginName);
  }

  has(pluginName: string): boolean {
    return this.plugins.has(pluginName);
  }

  get(pluginName: string): QueryStringPlugin | undefined {
    return this.plugins.get(pluginName);
  }

  list(): string[] {
    return Array.from(this.plugins.keys());
  }

  clear(): void {
    this.plugins.clear();
  }

  applyBeforeParse(input: string, options: ParseOptions): string {
    let result = input;
    
    for (const [_, plugin] of this.plugins) {
      if (plugin.beforeParse) {
        result = plugin.beforeParse(result, options);
      }
    }
    
    return result;
  }

  applyAfterParse(result: ParsedQuery, options: ParseOptions): ParsedQuery {
    let output = result;
    
    for (const [_, plugin] of this.plugins) {
      if (plugin.afterParse) {
        output = plugin.afterParse(output, options);
      }
    }
    
    return output;
  }

  applyBeforeStringify(obj: ParsedQuery, options: StringifyOptions): ParsedQuery {
    let result = obj;
    
    for (const [_, plugin] of this.plugins) {
      if (plugin.beforeStringify) {
        result = plugin.beforeStringify(result, options);
      }
    }
    
    return result;
  }

  applyAfterStringify(result: string, options: StringifyOptions): string {
    let output = result;
    
    for (const [_, plugin] of this.plugins) {
      if (plugin.afterStringify) {
        output = plugin.afterStringify(output, options);
      }
    }
    
    return output;
  }

  static create(plugins?: QueryStringPlugin[]): PluginManager {
    const manager = new PluginManager();
    
    if (plugins) {
      for (const plugin of plugins) {
        manager.register(plugin);
      }
    }
    
    return manager;
  }
}

export const createPlugin = (plugin: QueryStringPlugin): QueryStringPlugin => plugin;

export const timestampPlugin = createPlugin({
  name: 'timestamp',
  beforeStringify: (obj: ParsedQuery): ParsedQuery => {
    return {
      ...obj,
      _timestamp: Date.now(),
    };
  },
});

export const sortKeysPlugin = createPlugin({
  name: 'sortKeys',
  beforeStringify: (obj: ParsedQuery): ParsedQuery => {
    const sorted: ParsedQuery = {};
    const keys = Object.keys(obj).sort();
    
    for (const key of keys) {
      setKey(sorted, key, obj[key]);
    }
    
    return sorted;
  },
});

export const lowercaseKeysPlugin = createPlugin({
  name: 'lowercaseKeys',
  afterParse: (result: ParsedQuery): ParsedQuery => {
    const transformed: ParsedQuery = {};
    
    for (const [key, value] of Object.entries(result)) {
      setLowercased(transformed, key, value);
    }
    
    return transformed;
  },
  beforeStringify: (obj: ParsedQuery): ParsedQuery => {
    const transformed: ParsedQuery = {};
    
    for (const [key, value] of Object.entries(obj)) {
      setLowercased(transformed, key, value);
    }
    
    return transformed;
  },
});

export const filterEmptyPlugin = createPlugin({
  name: 'filterEmpty',
  beforeStringify: (obj: ParsedQuery): ParsedQuery => {
    const filtered: ParsedQuery = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (value !== '' && value !== null && value !== undefined) {
        if (Array.isArray(value) && value.length === 0) {
          continue;
        }
        setKey(filtered, key, value);
      }
    }
    
    return filtered;
  },
});

export const base64Plugin = createPlugin({
  name: 'base64',
  afterStringify: (result: string): string => {
    const globalObj = globalThis as any;
    if (typeof globalObj.btoa === 'function') {
      return globalObj.btoa(utf8ToBinary(result));
    }
    // Node.js environment
    return globalObj.Buffer?.from(result).toString('base64') || result;
  },
  beforeParse: (input: string): string => {
    try {
      const globalObj = globalThis as any;
      if (typeof globalObj.atob === 'function') {
        // Browser environment
        const decoded = globalObj.atob(input);
        const reencoded = globalObj.btoa(decoded);
        if (reencoded.replace(/=+$/, '') === input.replace(/=+$/, '')) {
          return binaryToUtf8(decoded);
        }
        return input;
      }
      // Node.js environment
      const Buffer = globalObj.Buffer;
      if (Buffer) {
        const decoded = Buffer.from(input, 'base64').toString('utf-8');
        const reencoded = Buffer.from(decoded).toString('base64');
        if (reencoded.replace(/=+$/, '') === input.replace(/=+$/, '')) {
          return decoded;
        }
      }
      return input;
    } catch {
      return input;
    }
  },
});

export const compressPlugin = createPlugin({
  name: 'compress',
  afterStringify: (result: string): string => {
    return result
      .replace(/(%20|%2520|\+)/g, ' ')
      .replace(/%2F/g, '/')
      .replace(/%3A/g, ':')
      .replace(/%3D/g, '=')
      .replace(/%26/g, '&')
      .replace(/%3F/g, '?');
  },
});

export const normalizePlugin = createPlugin({
  name: 'normalize',
  afterParse: (result: ParsedQuery): ParsedQuery => {
    return normalizeValues(result);
  },
});

function normalizeValues(obj: unknown): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    const trimmed = obj.trim();
    
    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;
    if (trimmed === 'null') return null;
    if (trimmed === 'undefined') return undefined;
    
    const num = Number(trimmed);
    if (!isNaN(num) && trimmed === String(num)) {
      return num;
    }
    
    return trimmed;
  }

  if (Array.isArray(obj)) {
    return obj.map(normalizeValues);
  }

  // [F013] Only plain data is normalized; Dates and other instances pass through untouched.
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const normalized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      setKey(normalized, key, normalizeValues(value));
    }
    return normalized;
  }

  return obj;
}

export const createCustomPlugin = (
  name: string,
  handlers: Partial<Omit<QueryStringPlugin, 'name'>>
): QueryStringPlugin => {
  return {
    name,
    ...handlers,
  };
};