import { StringifyOptions, ArrayFormat } from './types';
import { encode, isValidDate } from './utils/encoding';
import { isObject, hasOwn } from './utils/object';
import { joinArrayFormat } from './utils/array';

const defaults: Omit<Required<StringifyOptions>, 'encoder'> & { encoder?: StringifyOptions['encoder'] } = {
  delimiter: '&',
  strictNullHandling: false,
  skipNulls: false,
  encode: true,
  encoder: undefined,
  filter: undefined as unknown as Required<StringifyOptions>['filter'],
  arrayFormat: 'repeat',
  arrayFormatSeparator: ',',
  indices: false,
  sort: undefined as unknown as Required<StringifyOptions>['sort'],
  serializeDate: (date: Date) => date.toISOString(),
  format: 'RFC3986',
  encodeValuesOnly: false,
  addQueryPrefix: false,
  allowDots: false,
  charset: 'utf-8',
  charsetSentinel: false,
  comma: false,
  commaRoundTrip: false,
};

export function stringify(obj: unknown, options?: StringifyOptions): string {
  if (!obj || typeof obj !== 'object') {
    return '';
  }
  
  // Create a new seen set for each stringify operation
  const seen = new WeakSet<object>();

  const opts = { ...defaults, ...options };
  const {
    delimiter,
    strictNullHandling,
    skipNulls,
    encode: shouldEncode,
    encoder,
    filter,
    arrayFormat,
    arrayFormatSeparator,
    sort,
    serializeDate,
    format,
    encodeValuesOnly,
    addQueryPrefix,
    allowDots,
    charset,
    charsetSentinel,
    comma,
  } = opts;

  let objToStringify = obj;

  if (filter) {
    if (typeof filter === 'function') {
      objToStringify = filter('', obj) as object;
    } else if (Array.isArray(filter)) {
      const filtered: Record<string, unknown> = {};
      for (const key of filter) {
        if (hasOwn(obj as object, String(key))) {
          filtered[String(key)] = (obj as Record<string, unknown>)[String(key)];
        }
      }
      objToStringify = filtered;
    }
  }

  const pairs: string[] = [];
  stringifyObject(objToStringify as Record<string, unknown>, '', pairs, seen, {
    strictNullHandling,
    skipNulls,
    encode: shouldEncode,
    encoder: shouldEncode ? (str: string) => {
      if (typeof encoder === 'function') {
        return encoder(str, (s: string) => encode(s, format), charset);
      }
      return encode(str, format);
    } : (str: string) => str,
    keyEncoder: shouldEncode ? (str: string) => {
      if (typeof encoder === 'function') {
        return encoder(str, (s: string) => encode(s, format, true), charset);
      }
      return encode(str, format, true);
    } : (str: string) => str,
    arrayFormat,
    arrayFormatSeparator,
    serializeDate,
    format,
    encodeValuesOnly,
    allowDots,
    comma,
    filter,
  });

  if (sort) {
    const sorter = typeof sort === 'function' ? sort : (a: string, b: string) => a.localeCompare(b);
    pairs.sort((a, b) => {
      const aKey = a.split('=')[0];
      const bKey = b.split('=')[0];
      return sorter(aKey, bKey);
    });
  }

  let result = pairs.join(delimiter);

  if (charsetSentinel) {
    const charsetPrefix = charset === 'utf-8' ? 'utf8=%E2%9C%93' : 'utf8=%26%2310003%3B';
    result = result ? `${charsetPrefix}&${result}` : charsetPrefix;
  }

  if (addQueryPrefix) {
    result = '?' + result;
  }

  return result;
}

function stringifyObject(
  obj: Record<string, unknown>,
  prefix: string,
  pairs: string[],
  seen: WeakSet<object>,
  options: {
    strictNullHandling: boolean;
    skipNulls: boolean;
    encoder: (str: string) => string;
    keyEncoder: (str: string) => string;
    arrayFormat: ArrayFormat;
    arrayFormatSeparator: string;
    serializeDate: (date: Date) => string;
    format: 'RFC1738' | 'RFC3986';
    encodeValuesOnly: boolean;
    allowDots: boolean;
    comma: boolean;
    encode: boolean;
    filter?: Array<string | number> | ((prefix: string, value: unknown) => unknown);
  }
): void {
  const {
    strictNullHandling,
    skipNulls,
    encoder,
    keyEncoder,
    arrayFormat,
    arrayFormatSeparator,
    serializeDate,
    encodeValuesOnly,
    allowDots,
    // comma, // unused in stringifyObject
    filter,
  } = options;

  for (const key in obj) {
    if (!hasOwn(obj, key)) {
      continue;
    }

    const value = obj[key];
    
    // Skip functions
    if (typeof value === 'function') {
      continue;
    }
    
    const fullKey = prefix ? (allowDots ? `${prefix}.${key}` : `${prefix}[${key}]`) : key;

    if (filter) {
      const filtered = typeof filter === 'function' ? filter(fullKey, value) : value;
      if (filtered === undefined) {
        continue;
      }
    }

    if (value === null || value === undefined) {
      if (!strictNullHandling && !skipNulls) {
        const encodedKey = encodeValuesOnly ? fullKey : keyEncoder(fullKey);
        pairs.push(`${encodedKey}=`);
      } else if (strictNullHandling) {
        const encodedKey = encodeValuesOnly ? fullKey : keyEncoder(fullKey);
        pairs.push(encodedKey);
      }
      continue;
    }

    if (skipNulls && (value === null || value === undefined)) {
      continue;
    }

    if (isValidDate(value)) {
      const encodedKey = encodeValuesOnly ? fullKey : encoder(fullKey);
      const serialized = serializeDate(value);
      pairs.push(`${encodedKey}=${encoder(serialized)}`);
      continue;
    }

    if (Array.isArray(value)) {
      if (value.length === 0 && skipNulls) {
        continue;
      }

      const arrayPairs = joinArrayFormat(
        encodeValuesOnly ? fullKey : keyEncoder(fullKey),
        arrayFormat === 'json' ? value : value.map((v) => stringifyValue(v, { encoder, serializeDate })),
        arrayFormat,
        arrayFormatSeparator
      );

      // For JSON format, we need to encode the JSON value part
      if (arrayFormat === 'json') {
        for (let i = 0; i < arrayPairs.length; i++) {
          const pair = arrayPairs[i];
          const equalIndex = pair.indexOf('=');
          if (equalIndex !== -1) {
            const key = pair.substring(0, equalIndex);
            const value = pair.substring(equalIndex + 1);
            arrayPairs[i] = `${key}=${encoder(value)}`;
          }
        }
      }

      for (const pair of arrayPairs) {
        pairs.push(pair);
      }
      continue;
    }

    if (isObject(value)) {
      // Check for circular reference
      if (seen.has(value)) {
        continue;
      }
      seen.add(value);
      stringifyObject(value as Record<string, unknown>, fullKey, pairs, seen, options);
      seen.delete(value);
      continue;
    }

    const encodedKey = encodeValuesOnly ? fullKey : keyEncoder(fullKey);
    const encodedValue = encoder(String(value));
    pairs.push(`${encodedKey}=${encodedValue}`);
  }
}

function stringifyValue(
  value: unknown,
  options: {
    encoder: (str: string) => string;
    serializeDate: (date: Date) => string;
  }
): string {
  const { encoder, serializeDate } = options;

  if (value === null || value === undefined) {
    return '';
  }

  if (isValidDate(value)) {
    return serializeDate(value);
  }

  if (typeof value === 'object') {
    return encoder(JSON.stringify(value));
  }

  return String(value);
}

export function stringifyUrl(url: string, query: unknown, options?: StringifyOptions): string {
  if (!url || typeof url !== 'string') {
    return '';
  }

  const queryString = stringify(query, options);
  
  if (!queryString) {
    return url;
  }

  const separator = url.indexOf('?') !== -1 ? '&' : '?';
  return `${url}${separator}${queryString}`;
}