import { StringifyOptions, ArrayFormat } from './types';
import { encode, isValidDate } from './utils/encoding';
import { isObject, hasOwn, withOptions, jsonText } from './utils/object';
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

  const opts = withOptions(defaults, options);
  const {
    delimiter,
    strictNullHandling,
    skipNulls,
    encode: shouldEncode,
    encoder,
    filter,
    arrayFormat: configuredArrayFormat,
    arrayFormatSeparator,
    indices,
    sort,
    serializeDate,
    format,
    encodeValuesOnly,
    addQueryPrefix,
    allowDots,
    charset,
    charsetSentinel,
    comma,
    commaRoundTrip,
  } = opts;

  // [F024] `comma` / `indices` pick the array format unless arrayFormat is given explicitly.
  let arrayFormat: ArrayFormat = configuredArrayFormat;
  if (options?.arrayFormat === undefined) {
    if (comma) {
      arrayFormat = 'comma';
    } else if (indices) {
      arrayFormat = 'indices';
    }
  }

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
        return encoder(str, (s: string) => encode(s, format, false, charset), charset);
      }
      return encode(str, format, false, charset);
    } : (str: string) => str,
    keyEncoder: shouldEncode ? (str: string) => {
      if (typeof encoder === 'function') {
        return encoder(str, (s: string) => encode(s, format, true, charset), charset);
      }
      return encode(str, format, true, charset);
    } : (str: string) => str,
    arrayFormat,
    arrayFormatSeparator,
    serializeDate,
    format,
    encodeValuesOnly,
    allowDots,
    comma,
    commaRoundTrip,
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

  // [F059] Nothing to prefix for an empty query.
  if (addQueryPrefix && result) {
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
    commaRoundTrip: boolean;
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
    commaRoundTrip,
    filter,
  } = options;

  for (const key in obj) {
    if (!hasOwn(obj, key)) {
      continue;
    }

    let value = obj[key];
    
    // Skip functions
    if (typeof value === 'function') {
      continue;
    }
    
    const fullKey = prefix ? (allowDots ? `${prefix}.${key}` : `${prefix}[${key}]`) : key;

    if (filter && typeof filter === 'function') {
      // [F057] The returned value replaces the original (undefined drops the key), at every depth.
      value = filter(fullKey, value);
      if (value === undefined) {
        continue;
      }
    }

    if (value === null || value === undefined) {
      if (!strictNullHandling && !skipNulls) {
        const encodedKey = encodeValuesOnly ? fullKey : keyEncoder(fullKey);
        pairs.push(`${encodedKey}=`);
      } else if (strictNullHandling && !skipNulls) {
        // [F008] skipNulls wins over strictNullHandling.
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
      // [F058] skipNulls omits null / undefined elements, like it omits null properties.
      const items: unknown[] =
        skipNulls && arrayFormat !== 'json' ? value.filter((v) => v !== null && v !== undefined) : value;

      if (items.length === 0 && skipNulls) {
        continue;
      }

      // [F058] strictNullHandling: a null element is a bare key (as for a null property), not an empty value.
      if (
        strictNullHandling &&
        (arrayFormat === 'repeat' || arrayFormat === 'brackets' || arrayFormat === 'indices') &&
        items.some((v) => v === null || v === undefined)
      ) {
        const baseKey = encodeValuesOnly ? fullKey : keyEncoder(fullKey);
        items.forEach((item, index) => {
          const itemKey =
            arrayFormat === 'brackets'
              ? `${baseKey}[]`
              : arrayFormat === 'indices'
                ? `${baseKey}[${index}]`
                : baseKey;
          pairs.push(
            item === null || item === undefined
              ? itemKey
              : `${itemKey}=${stringifyValue(item, { encoder, serializeDate })}`
          );
        });
        continue;
      }

      // [F040] commaRoundTrip: a one-element comma array keeps its "[]" so it parses back as an array.
      const arrayKey =
        arrayFormat === 'comma' && commaRoundTrip && items.length === 1 ? `${fullKey}[]` : fullKey;

      const arrayPairs = joinArrayFormat(
        encodeValuesOnly ? arrayKey : keyEncoder(arrayKey),
        arrayFormat === 'json' ? items : items.map((v) => stringifyValue(v, { encoder, serializeDate })),
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

  // [F006] Every array element must be encoded, not only object elements.
  if (isValidDate(value)) {
    return encoder(serializeDate(value));
  }

  if (typeof value === 'object') {
    return encoder(jsonText(value));
  }

  return encoder(String(value));
}

export function stringifyUrl(url: string, query: unknown, options?: StringifyOptions): string {
  if (!url || typeof url !== 'string') {
    return '';
  }

  // [F059] The URL helper adds its own '?' / '&' separator; a query prefix would double it.
  const queryString = stringify(query, { ...options, addQueryPrefix: false });
  
  if (!queryString) {
    return url;
  }

  // [F025] The query belongs before the fragment.
  const hashIndex = url.indexOf('#');
  const base = hashIndex === -1 ? url : url.slice(0, hashIndex);
  const fragment = hashIndex === -1 ? '' : url.slice(hashIndex);
  const separator = base.indexOf('?') !== -1 ? '&' : '?';
  return `${base}${separator}${queryString}${fragment}`;
}